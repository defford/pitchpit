-- Track outbound clicks from public company listings.
alter table public.companies
  add column if not exists click_count integer not null default 0;

create or replace function public.increment_company_click(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.companies
  set click_count = click_count + 1
  where id = p_company_id
    and status = 'approved'
  returning click_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_company_click(uuid) from public;
grant execute on function public.increment_company_click(uuid) to service_role;
