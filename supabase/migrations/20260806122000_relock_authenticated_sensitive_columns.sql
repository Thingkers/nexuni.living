-- Sprint 0 / P0-4 — Every signed-in user can read every user's email,
-- bKash/Nagad numbers, student ID and ID-card location.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-4): 20260702180000_lock_down_
-- authenticated_sensitive_columns.sql revoked these five columns from
-- `authenticated`, but that revoke is NOT in effect on the live database:
--
--   authenticated | SELECT | avatar_url, bkash_number, created_at, email,
--                            full_name, gender, id, is_verified, locale,
--                            nagad_number, phone, role, student_id,
--                            student_id_card_url, university, university_id,
--                            verification_status          <- all 17 columns
--
-- `anon`'s allowlist from 20260702170000 *is* in effect (12 columns), so the
-- anon migration applied and the authenticated one did not — and neither is
-- recorded in supabase_migrations.schema_migrations, so nothing surfaced the
-- difference. Combined with the `"public can view profiles"` policy
-- (qual: true), any verified student can read the whole user base's contact
-- and mobile-money details in a single REST call.
--
-- WHY THE ORIGINAL REVOKE COULD NOT SIMPLY BE RE-RUN
--
-- src/app/dashboard/my-bookings/page.tsx joins
--   rooms( ..., profiles(full_name, phone, bkash_number, nagad_number) )
-- so the tenant can see where to send rent. Re-applying the bare revoke
-- would have made that query fail outright — which is the most likely reason
-- the revoke is missing today. Replaying it unchanged would just break the
-- payment flow again.
--
-- Auditing that join also turned up a smaller leak of its own: it fetches the
-- owner's payment numbers for EVERY booking the user has, including pending,
-- rejected and cancelled ones. Anyone could file a booking request they never
-- intend to honour and read the owner's bKash number off the response.
--
-- Fix: narrow `authenticated` to the same public-column allowlist `anon`
-- already has, and give the one legitimate cross-user read its own
-- SECURITY DEFINER function that enforces the rule the join never did —
-- payment details are visible to the tenant of that booking, and only once
-- the booking is actually confirmed or active.
--
-- The other two reads of sensitive columns already go through
-- SECURITY DEFINER functions and are unaffected:
--   - src/app/profile/page.tsx   -> get_my_profile()      (own row, all columns)
--   - src/app/admin/users/page.tsx -> admin_list_profiles() (admin-gated)

revoke select on public.profiles from authenticated;

-- Identical to anon's allowlist (20260702170000 + 20260711130000 +
-- 20260712110000 + 20260712140000). Deliberately excludes email,
-- bkash_number, nagad_number, student_id and student_id_card_url.
grant select (
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
) on public.profiles to authenticated;

-- The room owner's payout details for one booking, for that booking's tenant.
--
-- SECURITY DEFINER so it can read columns the caller no longer holds a grant
-- on; the authorization is the WHERE clause, not the caller's privileges.
-- Returns zero rows (not an error) when the caller is not the tenant or the
-- booking has not reached a payable state, so the UI can treat "no payment
-- details yet" as an ordinary empty result.
create or replace function public.get_booking_payment_details(p_booking_id uuid)
returns table (
  full_name     text,
  phone         text,
  bkash_number  text,
  nagad_number  text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.full_name, p.phone, p.bkash_number, p.nagad_number
  from public.bookings b
  join public.rooms r    on r.id = b.room_id
  join public.profiles p on p.id = r.owner_id
  where b.id = p_booking_id
    and b.user_id = auth.uid()
    and b.status in ('confirmed', 'active');
$$;

revoke all on function public.get_booking_payment_details(uuid) from public;
revoke all on function public.get_booking_payment_details(uuid) from anon;
grant execute on function public.get_booking_payment_details(uuid) to authenticated;

-- Verification:
--   As any signed-in user:
--     GET /rest/v1/profiles?select=email,bkash_number
--       -> 403, permission denied for column email
--     GET /rest/v1/profiles?select=id,full_name,avatar_url
--       -> still 200 (public columns unchanged)
--   As the tenant of a CONFIRMED booking:
--     select * from public.get_booking_payment_details('<booking id>');
--       -> one row
--   As the tenant of a PENDING booking, or as an unrelated user:
--       -> zero rows
--   Own full row and the admin user list are unaffected:
--     select * from public.get_my_profile();
--     select * from public.admin_list_profiles(50, 0);
