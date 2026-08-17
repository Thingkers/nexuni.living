-- P0 regression · six admin screens return nothing since Sprint 0
--
-- Problem:
--   20260806122000 narrowed `authenticated`'s SELECT on public.profiles to a
--   12-column allowlist that excludes `email`, to stop any signed-in user from
--   reading the whole user base's contact details. Correct on its own, but six
--   admin surfaces still embed that column:
--
--     src/app/admin/rooms/page.tsx                    profiles(full_name, email)
--     src/app/admin/roommates/page.tsx                profiles(full_name, email)
--     src/app/admin/reports/page.tsx                  profiles!reporter_id (full_name, email)
--     src/app/admin/module-admins/page.tsx            profiles!user_id(full_name, email)
--     src/features/jobs/components/JobsAdminPanel.tsx  profiles(full_name, email)
--     src/features/books/components/BooksAdminPanel.tsx profiles(full_name, email)
--
--   PostgREST fails the WHOLE request when one embedded column is denied, so
--   each of these pages gets no data at all and renders its empty state. The
--   pages look like they have nothing to show rather than like they are broken,
--   which is why this went unnoticed. Verified live on 2026-08-17:
--
--     set local role authenticated;
--     select email from public.profiles limit 1;
--       -> ERROR: permission denied for table profiles
--
--     has_column_privilege('authenticated','public.profiles','email','SELECT')
--       -> false
--
--   /admin/users is the one admin page that still works, because it reads
--   through admin_list_profiles() — a SECURITY DEFINER function, so column
--   grants do not apply to it.
--
-- Fix:
--   One narrow SECURITY DEFINER function that resolves a batch of user ids to
--   their name and email, and returns nothing at all to a caller who is neither
--   a global admin nor a module admin. The six call sites drop `email` from
--   their embeds and hydrate it through this instead.
--
-- Reason:
--   Granting `email` back to `authenticated` would undo the finding Sprint 0
--   was written to close, so the column stays revoked and the legitimate
--   privileged read gets its own audited entry point. That is the pattern this
--   database already uses three times over — get_my_profile() for the caller's
--   own row, admin_list_profiles() for the admin user list, and
--   get_booking_payment_details() for a tenant reading their landlord's payout
--   details — and this is the fourth instance of it, not a new idea.
--
--   Batched (uuid[] in, rows out) rather than one call per user: every caller
--   already holds a list and needs the whole list resolved, and a per-row RPC
--   would turn one admin page load into dozens of round trips.
--
--   Module admins are included because two of the six call sites are the jobs
--   and books panels, which are reachable by a module-scoped admin who does not
--   have profiles.role = 'admin'. Membership in module_admins at all is enough
--   here; which module they administer does not change what this returns, and
--   scoping it per module would mean threading a module argument through call
--   sites that have no reason to know about it.
--
--   Authorization is the WHERE clause, not the caller's privileges: an
--   unauthorized caller gets zero rows rather than an error, so a page that
--   loses access degrades to "no email shown" instead of failing outright —
--   which is precisely the failure mode this migration exists to remove.
--
create or replace function public.admin_get_user_contacts(p_user_ids uuid[])
returns table (
  id        uuid,
  full_name text,
  email     text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where p.id = any(p_user_ids)
    and (
      exists (
        select 1 from public.profiles me
        where me.id = (select auth.uid()) and me.role = 'admin'
      )
      or exists (
        select 1 from public.module_admins ma
        where ma.user_id = (select auth.uid())
      )
    );
$$;

revoke all on function public.admin_get_user_contacts(uuid[]) from public;
revoke all on function public.admin_get_user_contacts(uuid[]) from anon;
grant execute on function public.admin_get_user_contacts(uuid[]) to authenticated;

-- Verification:
--   As an admin:
--     select * from public.admin_get_user_contacts(
--       array(select id from public.profiles limit 3));
--       -> 3 rows, emails present
--
--   As a module admin (module_admins row, role <> 'admin'):
--       -> same 3 rows (the jobs and books panels need this)
--
--   As an ordinary signed-in student:
--       -> 0 rows, no error
--
--   As anon:
--     POST /rest/v1/rpc/admin_get_user_contacts
--       -> permission denied for function
--
--   The base-table revoke is untouched — this does not widen it:
--     set local role authenticated;
--     select email from public.profiles limit 1;
--       -> still ERROR: permission denied for table profiles
