-- PitchPit core schema
create extension if not exists pgcrypto;

do $$ begin create type public.tier as enum ('pit', 'undercard', 'main_event'); exception when duplicate_object then null; end $$;
do $$ begin create type public.company_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.billing_mode as enum ('one_day', 'daily_renew'); exception when duplicate_object then null; end $$;
do $$ begin create type public.placement_status as enum ('pending', 'active', 'expired', 'canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_role as enum ('owner', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.battle_status as enum ('open', 'resolved', 'expired'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'owner',
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  pitch text not null check (char_length(pitch) between 20 and 500),
  website_url text not null,
  logo_path text,
  tier public.tier not null default 'pit',
  preferred_billing_mode public.billing_mode not null default 'one_day',
  status public.company_status not null default 'draft',
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists companies_status_tier_idx on public.companies(status, tier);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tier public.tier not null,
  billing_mode public.billing_mode not null,
  status public.placement_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists placements_active_idx
  on public.placements(status, tier, ends_at)
  where status = 'active';
create index if not exists placements_company_id_idx on public.placements(company_id);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  season_key text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_ratings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tier public.tier not null,
  elo integer not null default 1500,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, company_id)
);

create index if not exists company_ratings_leaderboard_idx
  on public.company_ratings(season_id, tier, elo desc);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  tier public.tier not null,
  company_a_id uuid not null references public.companies(id),
  company_b_id uuid not null references public.companies(id),
  status public.battle_status not null default 'open',
  visitor_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (company_a_id <> company_b_id)
);

create index if not exists battles_open_idx on public.battles(status, expires_at);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null unique references public.battles(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  winner_id uuid not null references public.companies(id),
  loser_id uuid not null references public.companies(id),
  visitor_id text not null,
  ip_hash text,
  winner_elo_before integer not null,
  loser_elo_before integer not null,
  winner_elo_after integer not null,
  loser_elo_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists votes_visitor_day_idx on public.votes(visitor_id, created_at);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic vote RPC
create or replace function public.cast_vote(
  p_battle_id uuid,
  p_winner_id uuid,
  p_visitor_id text,
  p_ip_hash text default null,
  p_k integer default 32
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.battles%rowtype;
  winner_rating public.company_ratings%rowtype;
  loser_rating public.company_ratings%rowtype;
  loser_id uuid;
  expected_w double precision;
  expected_l double precision;
  new_w integer;
  new_l integer;
begin
  select * into b from public.battles where id = p_battle_id for update;
  if not found then
    raise exception 'battle_not_found';
  end if;
  if b.status <> 'open' then
    raise exception 'battle_not_open';
  end if;
  if b.expires_at < now() then
    update public.battles set status = 'expired' where id = b.id;
    raise exception 'battle_expired';
  end if;
  if b.visitor_id is not null and b.visitor_id <> p_visitor_id then
    raise exception 'visitor_mismatch';
  end if;
  if p_winner_id <> b.company_a_id and p_winner_id <> b.company_b_id then
    raise exception 'invalid_winner';
  end if;
  if exists (select 1 from public.votes where battle_id = b.id) then
    raise exception 'already_voted';
  end if;

  loser_id := case when p_winner_id = b.company_a_id then b.company_b_id else b.company_a_id end;

  select * into winner_rating from public.company_ratings
    where season_id = b.season_id and company_id = p_winner_id for update;
  select * into loser_rating from public.company_ratings
    where season_id = b.season_id and company_id = loser_id for update;

  if winner_rating.id is null or loser_rating.id is null then
    raise exception 'rating_missing';
  end if;

  expected_w := 1.0 / (1.0 + power(10.0, (loser_rating.elo - winner_rating.elo)::double precision / 400.0));
  expected_l := 1.0 - expected_w;
  new_w := round(winner_rating.elo + p_k * (1.0 - expected_w))::integer;
  new_l := round(loser_rating.elo + p_k * (0.0 - expected_l))::integer;

  update public.company_ratings
    set elo = new_w, wins = wins + 1, updated_at = now()
    where id = winner_rating.id;
  update public.company_ratings
    set elo = new_l, losses = losses + 1, updated_at = now()
    where id = loser_rating.id;

  insert into public.votes (
    battle_id, season_id, winner_id, loser_id, visitor_id, ip_hash,
    winner_elo_before, loser_elo_before, winner_elo_after, loser_elo_after
  ) values (
    b.id, b.season_id, p_winner_id, loser_id, p_visitor_id, p_ip_hash,
    winner_rating.elo, loser_rating.elo, new_w, new_l
  );

  update public.battles set status = 'resolved' where id = b.id;

  return jsonb_build_object(
    'winnerId', p_winner_id,
    'loserId', loser_id,
    'winnerEloAfter', new_w,
    'loserEloAfter', new_l
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.placements enable row level security;
alter table public.seasons enable row level security;
alter table public.company_ratings enable row level security;
alter table public.battles enable row level security;
alter table public.votes enable row level security;
alter table public.stripe_events enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Companies: public read approved; owners manage own; admins all
create policy "companies_public_read_approved" on public.companies for select using (
  status = 'approved'
  or owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "companies_owner_insert" on public.companies for insert with check (owner_id = auth.uid());
create policy "companies_owner_update" on public.companies for update using (
  owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Placements readable by owner/admin; public can see active for leaderboard joins via service role preferably
create policy "placements_owner_read" on public.placements for select using (
  exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.status = 'approved'))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "seasons_public_read" on public.seasons for select using (true);
create policy "ratings_public_read" on public.company_ratings for select using (true);
create policy "battles_public_read" on public.battles for select using (true);
create policy "votes_public_read" on public.votes for select using (true);

-- Storage bucket for logos
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_read" on storage.objects for select using (bucket_id = 'logos');
create policy "logos_owner_upload" on storage.objects for insert with check (
  bucket_id = 'logos' and auth.role() = 'authenticated'
);
create policy "logos_owner_update" on storage.objects for update using (
  bucket_id = 'logos' and auth.role() = 'authenticated'
);
