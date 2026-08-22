-- Hourly cards: point budgets, 10-minute grace, Elo at close

alter table public.cards
  add column if not exists grace_ends_at timestamptz,
  add column if not exists status text not null default 'open';

update public.cards
  set grace_ends_at = ends_at + interval '10 minutes'
  where grace_ends_at is null;

alter table public.cards
  alter column grace_ends_at set not null;

alter table public.cards
  drop constraint if exists cards_status_check;
alter table public.cards
  add constraint cards_status_check check (status in ('open', 'resolved'));

create index if not exists cards_status_grace_idx
  on public.cards(status, grace_ends_at);

alter table public.votes
  add column if not exists points_a integer not null default 0,
  add column if not exists points_b integer not null default 0;

alter table public.votes
  drop constraint if exists votes_points_nonneg;
alter table public.votes
  add constraint votes_points_nonneg check (points_a >= 0 and points_b >= 0);

create table if not exists public.visitor_card_opens (
  visitor_id text not null,
  card_id uuid not null references public.cards(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (visitor_id, card_id)
);

create index if not exists visitor_card_opens_card_idx
  on public.visitor_card_opens(card_id);

alter table public.visitor_card_opens enable row level security;

create or replace function public.allocate_vote(
  p_battle_id uuid,
  p_points_a integer,
  p_points_b integer,
  p_visitor_id text,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.battles%rowtype;
  c public.cards%rowtype;
  opened public.visitor_card_opens%rowtype;
  budget integer;
  ballot_winner_id uuid;
  ballot_loser_id uuid;
  visitor_card_votes integer;
begin
  select * into b from public.battles where id = p_battle_id for update;
  if not found then
    raise exception 'battle_not_found';
  end if;
  if b.status <> 'open' then
    raise exception 'battle_not_open';
  end if;
  if b.card_id is null then
    raise exception 'battle_not_open';
  end if;

  select * into c from public.cards where id = b.card_id for update;
  if not found then
    raise exception 'card_closed';
  end if;
  if c.status <> 'open' then
    raise exception 'card_closed';
  end if;
  if c.grace_ends_at <= now() then
    raise exception 'card_closed';
  end if;

  if c.ends_at <= now() then
    select * into opened
      from public.visitor_card_opens
      where visitor_id = p_visitor_id and card_id = c.id;
    if not found or opened.opened_at >= c.ends_at then
      raise exception 'card_closed';
    end if;
  end if;

  budget := case b.tier
    when 'pit' then 1
    when 'undercard' then 3
    when 'main_event' then 7
    else 1
  end;

  if p_points_a is null or p_points_b is null
     or p_points_a < 0 or p_points_b < 0
     or p_points_a + p_points_b <> budget then
    raise exception 'invalid_allocation';
  end if;

  if exists (
    select 1 from public.votes
    where battle_id = b.id and visitor_id = p_visitor_id
  ) then
    raise exception 'already_voted';
  end if;

  select count(*) into visitor_card_votes
  from public.votes v
  join public.battles vb on vb.id = v.battle_id
  where v.visitor_id = p_visitor_id
    and vb.card_id = b.card_id;
  if visitor_card_votes >= 6 then
    raise exception 'rate_limited';
  end if;

  if p_points_a >= p_points_b then
    ballot_winner_id := b.company_a_id;
    ballot_loser_id := b.company_b_id;
  else
    ballot_winner_id := b.company_b_id;
    ballot_loser_id := b.company_a_id;
  end if;

  insert into public.votes (
    battle_id, season_id, winner_id, loser_id, visitor_id, ip_hash,
    points_a, points_b,
    winner_elo_before, loser_elo_before, winner_elo_after, loser_elo_after
  ) values (
    b.id, b.season_id, ballot_winner_id, ballot_loser_id, p_visitor_id, p_ip_hash,
    p_points_a, p_points_b,
    null, null, null, null
  );

  update public.battles
    set votes_a = votes_a + p_points_a,
        votes_b = votes_b + p_points_b
    where id = b.id;

  insert into public.visitor_card_opens (visitor_id, card_id)
    values (p_visitor_id, c.id)
    on conflict (visitor_id, card_id) do nothing;

  return jsonb_build_object(
    'status', 'open',
    'votesA', b.votes_a + p_points_a,
    'votesB', b.votes_b + p_points_b,
    'voteBudget', budget,
    'myPointsA', p_points_a,
    'myPointsB', p_points_b,
    'myWinnerId', ballot_winner_id
  );
end;
$$;

create or replace function public.resolve_card(
  p_card_id uuid,
  p_k integer default 32
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.cards%rowtype;
  b public.battles%rowtype;
  rating_a public.company_ratings%rowtype;
  rating_b public.company_ratings%rowtype;
  total integer;
  score_a double precision;
  expected_a double precision;
  new_a integer;
  new_b integer;
  resolved_count integer := 0;
begin
  select * into c from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'card_not_found';
  end if;
  if c.status = 'resolved' then
    return jsonb_build_object('status', 'resolved', 'resolvedCount', 0);
  end if;

  for b in
    select * from public.battles
    where card_id = c.id and status = 'open'
    for update
  loop
    total := b.votes_a + b.votes_b;
    if total <= 0 then
      update public.battles set status = 'expired' where id = b.id;
      continue;
    end if;

    select * into rating_a from public.company_ratings
      where season_id = b.season_id and company_id = b.company_a_id for update;
    select * into rating_b from public.company_ratings
      where season_id = b.season_id and company_id = b.company_b_id for update;

    if rating_a.id is null or rating_b.id is null then
      raise exception 'rating_missing';
    end if;

    score_a := b.votes_a::double precision / total::double precision;
    expected_a := 1.0 / (1.0 + power(10.0, (rating_b.elo - rating_a.elo)::double precision / 400.0));
    new_a := round(rating_a.elo + p_k * (score_a - expected_a))::integer;
    new_b := round(rating_b.elo + p_k * ((1.0 - score_a) - (1.0 - expected_a)))::integer;

    if b.votes_a > b.votes_b then
      update public.company_ratings
        set elo = new_a, wins = wins + 1, updated_at = now()
        where id = rating_a.id;
      update public.company_ratings
        set elo = new_b, losses = losses + 1, updated_at = now()
        where id = rating_b.id;
      update public.battles set
        status = 'resolved',
        winner_id = b.company_a_id,
        loser_id = b.company_b_id,
        winner_elo_before = rating_a.elo,
        loser_elo_before = rating_b.elo,
        winner_elo_after = new_a,
        loser_elo_after = new_b
      where id = b.id;
    elsif b.votes_b > b.votes_a then
      update public.company_ratings
        set elo = new_a, losses = losses + 1, updated_at = now()
        where id = rating_a.id;
      update public.company_ratings
        set elo = new_b, wins = wins + 1, updated_at = now()
        where id = rating_b.id;
      update public.battles set
        status = 'resolved',
        winner_id = b.company_b_id,
        loser_id = b.company_a_id,
        winner_elo_before = rating_b.elo,
        loser_elo_before = rating_a.elo,
        winner_elo_after = new_b,
        loser_elo_after = new_a
      where id = b.id;
    else
      update public.company_ratings
        set elo = new_a, updated_at = now()
        where id = rating_a.id;
      update public.company_ratings
        set elo = new_b, updated_at = now()
        where id = rating_b.id;
      update public.battles set
        status = 'resolved',
        winner_id = null,
        loser_id = null,
        winner_elo_before = rating_a.elo,
        loser_elo_before = rating_b.elo,
        winner_elo_after = new_a,
        loser_elo_after = new_b
      where id = b.id;
    end if;

    resolved_count := resolved_count + 1;
  end loop;

  update public.cards set status = 'resolved' where id = c.id;

  return jsonb_build_object(
    'status', 'resolved',
    'resolvedCount', resolved_count
  );
end;
$$;
