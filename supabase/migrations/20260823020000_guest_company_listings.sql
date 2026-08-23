-- Allow public listings with no owner login.
alter table public.companies
  alter column owner_id drop not null;
