-- Finding: 20260702170000 fixed the fully-anonymous leak on `profiles`,
-- but the underlying "public can view profiles" row policy (qual: true)
-- still applies to the `authenticated` role too, and that role's column
-- grants were left untouched — so today ANY logged-in user can still read
-- ANY other logged-in user's email, bkash_number, nagad_number,
-- student_id, and student_id_card_url via a direct REST call. The app's
-- own UI never requests these for anyone but the current user or (for
-- admins) the user-management page, but RLS + column grants can't express
-- "full row for me, public columns only for others" on one table/role —
-- there's no such thing as a row-conditional column grant in Postgres.
--
-- Fix: revoke these columns from `authenticated` at the table level, and
-- provide two SECURITY DEFINER functions that do the two legitimate
-- reads the app actually needs — each does its own authorization check
-- internally, then returns full rows regardless of the caller's (now
-- reduced) column grants, since SECURITY DEFINER runs as the function
-- owner. `role`/`is_verified`/`verification_status` are left alone: role
-- is read inside several other tables' RLS policies (e.g. bookings'
-- "is admin" checks) via a subquery that still needs it, and knowing
-- whether *someone else* is admin/verified isn't sensitive the way an ID
-- card photo or a mobile-money number is.
revoke select (email, bkash_number, nagad_number, student_id, student_id_card_url)
on public.profiles
from authenticated;

-- src/app/profile/page.tsx: the current user reading their own full row.
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

-- src/app/admin/users/page.tsx: admin's paginated user list. Mirrors that
-- page's current query (created_at desc, range-based pagination).
create or replace function public.admin_list_profiles(p_limit int, p_offset int)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  return query
    select * from public.profiles
    order by created_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke all on function public.admin_list_profiles(int, int) from public;
grant execute on function public.admin_list_profiles(int, int) to authenticated;
