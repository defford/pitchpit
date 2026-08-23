-- Exhibition cards mint extra matchups as visitors vote. Cap ballots to the
-- number of fights on the card (6 on a full card; unbounded exhibitions).

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
  battle_count integer;
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
  select count(*) into battle_count
  from public.battles
  where card_id = b.card_id;
  if visitor_card_votes >= battle_count then
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
