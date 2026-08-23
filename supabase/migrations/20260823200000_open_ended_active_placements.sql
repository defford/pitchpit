-- Free listings stay on the card; extend any still-active paid windows.
update public.placements
set
  ends_at = '2099-01-01T00:00:00.000Z',
  updated_at = now()
where status = 'active'
  and ends_at is not null
  and ends_at < '2099-01-01T00:00:00.000Z';
