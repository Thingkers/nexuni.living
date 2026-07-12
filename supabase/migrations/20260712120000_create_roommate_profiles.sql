-- Problem: docs/feature-breakdown.md §4 (Roommate Matching) needs a place
-- for verified users to post a roommate-seeking profile, discoverable by
-- other verified users, with a lifecycle that supports drafts (resumable
-- across sessions) and a soft-delete-only model (no hard deletes).
--
-- Fix: a new roommate_profiles table with a single lifecycle enum (no
-- parallel is_active boolean — rooms, this repo's closest precedent, uses
-- one status enum with no second flag, and the requested 'paused' status
-- already covers "temporarily hidden without changing lifecycle stage").
--
-- This also introduces the first verification-gated RLS policy in this
-- codebase -- every existing verification check (profiles.verification_status)
-- has so far been application-code only. The SELECT policy below combines
-- owner/admin/active+verified into ONE policy rather than three stacked
-- ones, deliberately: 20260702160000_remove_redundant_rooms_visibility_policies.sql
-- is a postmortem of exactly that mistake on `rooms` (two leftover
-- permissive policies silently widened a correct restrictive one, since
-- Postgres OR-combines all permissive policies on a table).
create table public.roommate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),

  bio text,
  gender text check (gender in ('male', 'female')),
  age int check (age is null or (age >= 16 and age <= 100)),

  university_id uuid references public.universities(id) on delete set null,
  locality_id uuid references public.localities(id) on delete set null,

  budget_min int,
  budget_max int,

  sleep_schedule text check (sleep_schedule in ('early_bird', 'night_owl', 'flexible')),
  cleanliness_level text check (cleanliness_level in ('relaxed', 'moderate', 'very_clean')),
  smoking_preference text check (smoking_preference in ('smoker', 'non_smoker')),
  guest_preference text check (guest_preference in ('rarely', 'sometimes', 'often')),

  preferred_gender text check (preferred_gender in ('male', 'female', 'any')),
  preferred_university_id uuid references public.universities(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mirrors rooms_visible_created_at_idx's partial-index pattern: the public
-- board only ever queries status = 'active', so index just that slice.
create index roommate_profiles_active_created_at_idx
  on public.roommate_profiles (created_at desc)
  where status = 'active';

create index roommate_profiles_university_id_idx on public.roommate_profiles (university_id);
create index roommate_profiles_locality_id_idx on public.roommate_profiles (locality_id);

alter table public.roommate_profiles enable row level security;

-- Owner (any status, so a user can always see/resume their own draft),
-- admin (so report moderation can load a reported profile regardless of
-- its status), or active+verified (public discovery) -- one combined
-- policy, see header comment for why.
create policy "roommate_profiles read: owner, admin, or active+verified" on public.roommate_profiles
for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or (
    status = 'active'
    and exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'approved')
  )
);

create policy "roommate_profiles insert: own row, verified only" on public.roommate_profiles
for insert
with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'approved')
);

-- Deliberately does NOT re-check verification_status: if a user's
-- verification is later revoked, they must still be able to log in and
-- archive/withdraw their own profile. No DELETE policy at all -- default
-- deny, matching the soft-delete-via-status preference with zero extra code.
create policy "roommate_profiles update: own row" on public.roommate_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
