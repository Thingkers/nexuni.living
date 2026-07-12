-- Problem: docs/feature-breakdown.md §4.3 wants roommate profiles to be
-- reportable, reusing "the existing report system." The live `reports`
-- table only supports room_id (NOT NULL FK, no polymorphic target column),
-- and its RLS policy text isn't captured in any tracked migration (the
-- base table predates this repo's migration history) -- so widening it
-- here would mean modifying an existing table's constraints/policies
-- without the before/after diff Hard Rule 1 requires. Decided directly
-- with the user: a standalone table instead, safe to fully define from
-- scratch in one migration.
--
-- Fix: roommate_profile_reports, mirroring reports' inferred shape
-- (reporter_id, reason, details, status, created_at, one report per
-- reporter per target).
create table public.roommate_profile_reports (
  id uuid primary key default gen_random_uuid(),
  roommate_profile_id uuid not null references public.roommate_profiles(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (roommate_profile_id, reporter_id)
);

alter table public.roommate_profile_reports enable row level security;

create policy "roommate_profile_reports insert: own reporter_id only" on public.roommate_profile_reports
for insert
with check (auth.uid() = reporter_id);

-- One combined policy (own-or-admin), not two stacked ones -- same
-- OR-footgun reasoning as roommate_profiles' SELECT policy.
create policy "roommate_profile_reports read: own or admin" on public.roommate_profile_reports
for select
using (
  auth.uid() = reporter_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Admin-only UPDATE is required, not optional: this app's report
-- moderation (src/app/admin/reports/page.tsx) is plain client-side calls
-- gated entirely by RLS, not a service-role route.
create policy "roommate_profile_reports update: admin only" on public.roommate_profile_reports
for update
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
