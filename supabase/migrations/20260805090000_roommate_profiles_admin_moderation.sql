-- Problem: the admin panel has no way to moderate roommate listings.
-- roommate_profiles' RLS currently only lets the owner UPDATE their own row
-- (20260712120000_create_roommate_profiles.sql), and has no DELETE policy
-- at all (deliberate soft-delete-only design per that migration's comment).
-- Decided directly with the user: admin moderation of this table now needs
-- real status control and real hard delete, matching what /admin/rooms
-- already does for rooms -- so both the update policy and a new delete
-- policy are required.
--
-- Fix: replace the owner-only UPDATE policy with one combined owner-or-admin
-- policy (same one-permissive-policy convention this table's own SELECT
-- policy and roommate_profile_reports already use, instead of stacking a
-- second permissive policy on top), and add a new admin-only DELETE policy.
drop policy "roommate_profiles update: own row" on public.roommate_profiles;

create policy "roommate_profiles update: own row or admin" on public.roommate_profiles
for update
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "roommate_profiles delete: admin only" on public.roommate_profiles
for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
