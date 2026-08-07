-- Sprint 0 / P0-3 — Unauthenticated mass write to public.profiles.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-3): admin_backfill_university_
-- suggestion() exists only on the live database — it appears in no migration
-- in this repository, so it has never been reviewed in a diff. Verified live:
--
--   prosecdef: true                                  (SECURITY DEFINER)
--   proacl:    postgres=X | anon=X | service_role=X  (anon can EXECUTE)
--   body:      no admin check of any kind
--
-- Its three sibling functions — admin_list_profiles(),
-- admin_list_university_suggestions(), admin_list_dismissed_university_
-- suggestions() — all open with
--   if not exists (select 1 from profiles where id = auth.uid() and role = 'admin')
--   then raise exception 'admin only'; end if;
-- This one does not, and it is the only one of the four that WRITES.
--
-- Because it is SECURITY DEFINER it runs as the owner and bypasses RLS
-- entirely, so anyone on the internet holding the (public, browser-shipped)
-- anon key could POST /rest/v1/rpc/admin_backfill_university_suggestion and
-- rewrite university_id across the whole user base, repeatedly and unmetered.
--
-- Confirmed by inspection only — the function was never actually invoked
-- against production during the audit.
--
-- Fix: bring the function under version control with the same admin guard
-- its siblings use, and remove EXECUTE from anon. `authenticated` keeps
-- EXECUTE because the admin UI calls it with a normal user session; the
-- in-body check is what distinguishes an admin from any other signed-in user
-- (again matching the sibling functions' established pattern).
--
-- create or replace, not drop+create: the admin university-suggestions
-- screen calls this by name today, and replacing in place keeps that working
-- with no window where the function is missing.

create or replace function public.admin_backfill_university_suggestion(
  p_normalized_text text,
  p_university_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  update public.profiles
  set university_id = p_university_id
  where university_id is null
    and lower(trim(university)) = p_normalized_text;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_backfill_university_suggestion(text, uuid) from public;
revoke all on function public.admin_backfill_university_suggestion(text, uuid) from anon;
grant execute on function public.admin_backfill_university_suggestion(text, uuid) to authenticated;

-- Verification:
--   As anon (anon key only, no session):
--     POST /rest/v1/rpc/admin_backfill_university_suggestion
--       -> 404/403, permission denied for function
--   As a plain student:
--     select public.admin_backfill_university_suggestion('aiub', '<uuid>');
--       -> ERROR: admin only
--   As a global admin: returns the affected row count as before.
