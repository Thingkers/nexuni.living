-- P0-C · reconcile the repository with what Sprint 0 actually ran
--
-- Problem:
--   Sprint 0 was delivered as two passes. The FIRST pass was applied to the
--   database; the SECOND pass is what now sits in supabase/migrations/. The two
--   share version numbers, so `supabase db push` considers 20260806120000 …
--   20260806125000 already applied and will never notice the difference. The
--   divergence is permanent and silent — the same class of failure Sprint 0
--   itself was written to repair.
--
--   Verified live on 2026-08-07:
--
--     to_regclass('public.public_profiles')   -> NULL     -- view never created
--     to_regclass('public.storage_purge_log') -> NULL     -- table never created
--
--     select proacl from pg_proc
--     where proname = 'admin_backfill_university_suggestion';
--       -> {postgres=X/postgres, anon=X/postgres,
--           authenticated=X/postgres,        <-- second pass revokes this
--           service_role=X/postgres}
--
--   Confirmed independently by the Supabase advisor, which reports
--   `authenticated_security_definer_function_executable` for that function.
--
-- Fix:
--   Re-apply, as a new forward migration, the two second-pass items that never
--   reached the database. Nothing here edits an existing migration file.
--
-- Reason:
--   A new migration is the only correct instrument. Editing 20260806121000 or
--   20260806122000 would change history without changing the database, since
--   their versions are already recorded — the drift would survive and the files
--   would simply lie in a new way.
--
--   Everything here is idempotent (`create or replace`, `revoke`), so the
--   database converges to the same state whether it arrives via this migration
--   on the existing project or via the second-pass files on a fresh
--   `supabase db reset`. That convergence is the point: both paths must land in
--   the same place, or the drift just reappears from the other direction.
--
--   NOT INCLUDED: public.storage_purge_log, from the second pass of
--   20260806125000. That table existed to inventory orphaned ID cards before
--   purging them. The student-id-cards bucket was cleared manually and
--   deliberately on 2026-08-07 (confirmed by the project owner), so there is
--   nothing left to inventory and an empty audit table would record nothing.
--   Creating it now would be cargo cult.
--
-- ── PART 1 · admin_backfill_university_suggestion — EXECUTE from authenticated
--
-- The function body's `admin only` guard IS live, so this was never
-- exploitable. What is missing is the outer layer: the function is unreachable
-- from application code (grep across src/ finds no caller — no page, no route,
-- no hook), so it has no business being on the PostgREST surface at all.
-- service_role keeps EXECUTE, so a future admin API route can still call it.
--
-- BEFORE: postgres=X, anon=X, authenticated=X, service_role=X
-- AFTER:  postgres=X,                          service_role=X
--
revoke all on function public.admin_backfill_university_suggestion(text, uuid) from public;
revoke all on function public.admin_backfill_university_suggestion(text, uuid) from anon;
revoke all on function public.admin_backfill_university_suggestion(text, uuid) from authenticated;
grant execute on function public.admin_backfill_university_suggestion(text, uuid) to service_role;

-- ── PART 2 · public.public_profiles ──────────────────────────────────────────
--
-- Sprint 0 narrowed `authenticated`'s SELECT on public.profiles to a 12-column
-- allowlist, and that revoke IS live and verified. But the allowlist protects
-- the table while saying nothing about intent: the next person to add a column
-- has no way to know, from the schema alone, that a routine `grant select` on
-- it silently widens what every user of the platform can read. That is exactly
-- how the drift this repairs came about in the first place.
--
-- This view makes the public set explicit and reviewable in one place, so new
-- code can select from public_profiles and never name the base table.
--
-- security_invoker = on so RLS and column grants are still evaluated as the
-- CALLER. Without it a view is effectively SECURITY DEFINER and would hand back
-- precisely the columns the Sprint 0 revoke removed — Supabase's linter flags
-- that as `security_definer_view`. Requires PG15+; this project runs 17.6.
--
-- Column list is identical to anon's allowlist (20260702170000 + 20260711130000
-- + 20260712110000 + 20260712140000) and to authenticated's after Sprint 0.
-- Deliberately excludes email, bkash_number, nagad_number, student_id and
-- student_id_card_url.
--
-- NOT wired into the application by this migration. Nothing selects from it
-- yet; migrating the ~10 call sites that read `profiles` directly is a
-- follow-up refactor, not part of a P0 fix.
--
-- `phone` is included, deliberately. It has been anon-readable since
-- 20260702170000, whose comment records the decision — a classifieds-style
-- contact number, same as the room's own phone — and the public listing pages,
-- /users/[id] and the home feed all render it for logged-out visitors.
-- Dropping it here would make the view unusable for its intended callers while
-- changing nothing about what is actually exposed. Whether student phone
-- numbers should be public at all is a product question, still open, tracked in
-- docs/integration-audit-2026-08-07.md.
--
create or replace view public.public_profiles
with (security_invoker = on)
as
select
  id,
  full_name,
  avatar_url,
  phone,
  university,
  university_id,
  gender,
  is_verified,
  verification_status,
  role,
  locale,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Verification:
--   select to_regclass('public.public_profiles');
--     -> public.public_profiles   (was NULL)
--
--   select reloptions from pg_class where relname = 'public_profiles';
--     -> {security_invoker=on}
--
--   select proacl from pg_proc
--   where proname = 'admin_backfill_university_suggestion';
--     -> no anon=X, no authenticated=X
--
--   As a signed-in student:
--     POST /rest/v1/rpc/admin_backfill_university_suggestion
--       -> permission denied for function
--     GET  /rest/v1/public_profiles?select=id,full_name
--       -> 200
--     GET  /rest/v1/public_profiles?select=email
--       -> 400, column public_profiles.email does not exist
