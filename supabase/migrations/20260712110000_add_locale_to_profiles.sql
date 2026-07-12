-- Problem: the new Bangla/English UI (next-intl) picks a locale from a
-- NEXT_LOCALE cookie, which is device/browser-scoped -- a user's language
-- choice doesn't follow them if they log in from a different browser or
-- device.
--
-- Fix: a nullable profiles.locale column, set (alongside the cookie) by the
-- language-toggle Server Action (src/features/i18n/actions.ts) whenever a
-- logged-in user switches language, so the choice can be re-applied on a
-- future session. `text check (locale in ('en', 'bn'))` matches this repo's
-- established convention for small fixed-value-set columns (see
-- universities.type), not a bare unconstrained text column.
alter table public.profiles
  add column if not exists locale text check (locale in ('en', 'bn'));

-- profiles' anon/authenticated SELECT was locked down to an explicit column
-- allowlist in 20260702170000_restrict_anon_profile_columns.sql and
-- 20260702180000_lock_down_authenticated_sensitive_columns.sql -- a new
-- column is invisible to both roles until added here (same pattern the
-- university_id migration needed). No UPDATE grant needed (table-wide
-- UPDATE for authenticated was never revoked), and locale is not in the
-- prevent_self_privilege_escalation trigger's guarded-column list (role,
-- is_verified, verification_status only), so a user can set their own
-- locale via the existing "update own profile" policy.
grant select (locale) on public.profiles to anon, authenticated;
