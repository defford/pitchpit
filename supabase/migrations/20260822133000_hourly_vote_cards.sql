-- Shared hourly Decagon cards: 6 matchups, 6 ballots per visitor per card

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  hour_key text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cards_season_id_idx on public.cards(season_id);

alter table public.battles
  add column if not exists card_id uuid references public.cards(id) on delete set null,
  add column if not exists card_slot smallint;

create unique index if not exists battles_card_slot_unique
  on public.battles(card_id, card_slot)
  where card_id is not null;

create index if not exists battles_card_id_idx on public.battles(card_id);

alter table public.cards enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'cards' and policyname = 'cards_public_read'
  ) then
    create policy "cards_public_read" on public.cards for select using (true);
  end if;
end $$;

-- Enforce 6 ballots per visitor per card (or per rolling hour for legacy fights)
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
  series_winner_id uuid;
  series_loser_id uuid;
  ballot_loser_id uuid;
  expected_w double precision;
  expected_l double precision;
  new_w integer;
  new_l integer;
  votes_needed integer;
  next_votes_a integer;
  next_votes_b integer;
  visitor_card_votes integer;
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
  if p_winner_id <> b.company_a_id and p_winner_id <> b.company_b_id then
    raise exception 'invalid_winner';
  end if;
  if exists (
    select 1 from public.votes
    where battle_id = b.id and visitor_id = p_visitor_id
  ) then
    raise exception 'already_voted';
  end if;

  if b.card_id is not null then
    select count(*) into visitor_card_votes
    from public.votes v
    join public.battles vb on vb.id = v.battle_id
    where v.visitor_id = p_visitor_id
      and vb.card_id = b.card_id;
    if visitor_card_votes >= 6 then
      raise exception 'rate_limited';
    end if;
  else
    select count(*) into visitor_card_votes
    from public.votes
    where visitor_id = p_visitor_id
      and created_at >= now() - interval '1 hour';
    if visitor_card_votes >= 6 then
      raise exception 'rate_limited';
    end if;
  end if;

  next_votes_a := b.votes_a;
  next_votes_b := b.votes_b;
  if p_winner_id = b.company_a_id then
    next_votes_a := next_votes_a + 1;
  else
    next_votes_b := next_votes_b + 1;
  end if;

  votes_needed := case b.tier
    when 'pit' then 1
    when 'undercard' then 2
    when 'main_event' then 4
    else 1
  end;

  ballot_loser_id := case
    when p_winner_id = b.company_a_id then b.company_b_id
    else b.company_a_id
  end;

  insert into public.votes (
    battle_id, season_id, winner_id, loser_id, visitor_id, ip_hash,
    winner_elo_before, loser_elo_before, winner_elo_after, loser_elo_after
  ) values (
    b.id, b.season_id, p_winner_id, ballot_loser_id, p_visitor_id, p_ip_hash,
    null, null, null, null
  );

  update public.battles
    set votes_a = next_votes_a, votes_b = next_votes_b
    where id = b.id;

  if next_votes_a >= votes_needed or next_votes_b >= votes_needed then
    if next_votes_a >= votes_needed then
      series_winner_id := b.company_a_id;
      series_loser_id := b.company_b_id;
    else
      series_winner_id := b.company_b_id;
      series_loser_id := b.company_a_id;
    end if;

    select * into winner_rating from public.company_ratings
      where season_id = b.season_id and company_id = series_winner_id for update;
    select * into loser_rating from public.company_ratings
      where season_id = b.season_id and company_id = series_loser_id for update;

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

    update public.battles set
      status = 'resolved',
      winner_id = series_winner_id,
      loser_id = series_loser_id,
      winner_elo_before = winner_rating.elo,
      loser_elo_before = loser_rating.elo,
      winner_elo_after = new_w,
      loser_elo_after = new_l
    where id = b.id;

    return jsonb_build_object(
      'status', 'resolved',
      'votesA', next_votes_a,
      'votesB', next_votes_b,
      'votesToWin', votes_needed,
      'myWinnerId', p_winner_id,
      'winnerId', series_winner_id,
      'loserId', series_loser_id,
      'winnerEloAfter', new_w,
      'loserEloAfter', new_l,
      'winnerEloBefore', winner_rating.elo,
      'loserEloBefore', loser_rating.elo
    );
  end if;

  return jsonb_build_object(
    'status', 'open',
    'votesA', next_votes_a,
    'votesB', next_votes_b,
    'votesToWin', votes_needed,
    'myWinnerId', p_winner_id,
    'winnerId', null,
    'loserId', null
  );
end;
$$;
