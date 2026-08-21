-- Shared best-of Decagon series: multi-voter ballots, live scores, Elo on resolve

-- Battles: denormalized live tally + optional result snapshots
alter table public.battles
  add column if not exists votes_a integer not null default 0,
  add column if not exists votes_b integer not null default 0,
  add column if not exists winner_id uuid references public.companies(id),
  add column if not exists loser_id uuid references public.companies(id),
  add column if not exists winner_elo_before integer,
  add column if not exists loser_elo_before integer,
  add column if not exists winner_elo_after integer,
  add column if not exists loser_elo_after integer;

alter table public.battles
  drop constraint if exists battles_votes_nonneg;
alter table public.battles
  add constraint battles_votes_nonneg check (votes_a >= 0 and votes_b >= 0);

-- Votes: many ballots per battle, one per visitor
alter table public.votes drop constraint if exists votes_battle_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'votes_battle_visitor_unique'
  ) then
    alter table public.votes
      add constraint votes_battle_visitor_unique unique (battle_id, visitor_id);
  end if;
end $$;

-- Ballot rows no longer store Elo; Elo lives on the battle when resolved
alter table public.votes
  alter column winner_elo_before drop not null,
  alter column loser_elo_before drop not null,
  alter column winner_elo_after drop not null,
  alter column loser_elo_after drop not null;

create index if not exists votes_battle_id_idx on public.votes(battle_id);

-- Realtime: live vote inserts for open fights
alter table public.votes replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.votes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Atomic cast_vote: ballot + score; Elo only when series majority reached
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
