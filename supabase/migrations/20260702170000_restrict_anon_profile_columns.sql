-- Finding: "public can view profiles" is qual:true for role `public`,
-- which includes fully unauthenticated visitors (anon). RLS is row-level
-- only, so with no column restriction, anyone hitting the REST API
-- directly (no login required) could read every user's email, phone,
-- bkash_number, nagad_number, student_id, and student_id_card_url (their
-- uploaded ID card photo).
--
-- This revokes anon's table-wide SELECT grant and re-grants only the
-- columns the app actually shows to logged-out visitors (public listings
-- page and public /users/[id] profile page): name, avatar, phone
-- (intentionally public — this is a classifieds-style contact number,
-- same as the room's own phone), university, gender, verification badge,
-- and join date.
revoke select on public.profiles from anon;

grant select (
  id,
  full_name,
  avatar_url,
  phone,
  university,
  gender,
  is_verified,
  created_at
) on public.profiles to anon;

-- Note: this migration intentionally does NOT touch the `authenticated`
-- role's grants. Any logged-in user can still read another logged-in
-- user's bkash_number / nagad_number / student_id / student_id_card_url
-- via a direct API call today (the app's own UI never requests these for
-- anyone but the current user, but RLS+column-grants alone can't express
-- "full row for me, public columns only for others" on one table/role —
-- that needs a public-columns view or a split table). This migration
-- closes the worse of the two holes (fully anonymous, no-login-required
-- access); the authenticated-to-authenticated gap is a separate, larger
-- follow-up if it's needed.

-- The student-ID login flow (src/app/auth/login/page.tsx) needs to look
-- up a user's email by student_id BEFORE they're authenticated — i.e. as
-- anon. Since email is no longer anon-readable, that lookup can't go
-- through a plain column select anymore. This function does the one
-- narrow thing the login flow actually needs (resolve student_id -> email
-- for signInWithPassword) without exposing the email column itself to
-- anon at all.
create or replace function public.get_email_by_student_id(p_student_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.profiles where student_id = p_student_id limit 1;
$$;

revoke all on function public.get_email_by_student_id(text) from public;
grant execute on function public.get_email_by_student_id(text) to anon, authenticated;
