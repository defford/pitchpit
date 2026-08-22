-- profiles_admin_all used EXISTS (SELECT ... FROM profiles ...), which
-- re-enters RLS on the same table and fails with infinite recursion.
-- SECURITY DEFINER lets the admin check read profiles without that loop.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());
