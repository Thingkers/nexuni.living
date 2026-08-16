-- Problem: docs/feature-breakdown.md §8/§11.1 (Used Books, Jobs) need a
-- generalized listings table so those verticals don't each get a bespoke
-- top-level table. §12 originally proposed folding the existing `rooms`
-- table into this model, but investigation of the live booking system found
-- that unsafe here: public.set_booking_status() (see
-- 20260703100000_atomic_booking_actions.sql) takes `SELECT ... FOR UPDATE`
-- locks directly on `rooms` and writes `available_seats` in place to fix a
-- real overselling bug -- a pattern that does not translate safely onto a
-- join view, and 23 application files query `rooms` directly.
--
-- Fix: `rooms` and all booking triggers/RPCs stay completely untouched.
-- This migration only adds a new, separate `listings` table (+ per-type
-- detail tables) for the verticals that are actually listing-shaped:
-- Books and Jobs. Local Services (§9) is a moderator-curated directory of
-- places, not a user listing, and Transport (§11.2) is route data -- both
-- get their own dedicated tables in their own future sprints, not this one.
--
-- No UI reads/writes these tables yet -- that's Sprint 9 (Books) and
-- Sprint 11 (Jobs) in docs/playbook.md. See docs/listings-architecture.md
-- for the full design note.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  listing_type text not null check (listing_type in ('book', 'job')),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text,
  price int check (price is null or price >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),

  locality_id uuid references public.localities(id) on delete set null,
  university_id uuid references public.universities(id) on delete set null,
  images text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_book_details (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  author text,
  course_code text,
  department text,
  condition text check (condition in ('new', 'good', 'fair')),
  negotiable boolean not null default false
);

create table if not exists public.listing_job_details (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  employer text not null,
  job_type text check (job_type in ('part_time', 'internship')),
  salary_min int,
  salary_max int,
  apply_method text check (apply_method in ('link', 'phone', 'chat')),
  apply_value text
);

-- Mirrors roommate_profiles_active_created_at_idx's partial-index pattern:
-- the public board only ever queries status = 'active'.
create index if not exists listings_active_created_at_idx
  on public.listings (listing_type, created_at desc)
  where status = 'active';

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_locality_id_idx on public.listings (locality_id);
create index if not exists listings_university_id_idx on public.listings (university_id);

alter table public.listings enable row level security;
alter table public.listing_book_details enable row level security;
alter table public.listing_job_details enable row level security;

-- One combined SELECT policy (not stacked permissive policies) -- see
-- 20260702160000_remove_redundant_rooms_visibility_policies.sql for why
-- `rooms` had to be fixed after getting this wrong: Postgres OR-combines
-- every permissive policy on a table, so redundant policies can silently
-- widen an otherwise-correct restrictive one.
drop policy if exists "listings read: owner, admin, or active" on public.listings;

create policy "listings read: owner, admin, or active" on public.listings
for select
using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or status = 'active'
);

drop policy if exists "listings insert: own row" on public.listings;

create policy "listings insert: own row" on public.listings
for insert
with check (auth.uid() = owner_id);

drop policy if exists "listings update: owner or admin" on public.listings;

create policy "listings update: owner or admin" on public.listings
for update
using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "listings delete: owner or admin" on public.listings;

create policy "listings delete: owner or admin" on public.listings
for delete
using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Detail tables proxy the same owner/admin/active visibility through their
-- parent listing -- the same join-through-parent pattern bookings' RLS
-- already uses against rooms.owner_id.
drop policy if exists "listing_book_details read: via parent listing" on public.listing_book_details;

create policy "listing_book_details read: via parent listing" on public.listing_book_details
for select
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_book_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or listings.status = 'active'
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
);

drop policy if exists "listing_book_details write: owner or admin" on public.listing_book_details;

create policy "listing_book_details write: owner or admin" on public.listing_book_details
for all
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_book_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_book_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
);

drop policy if exists "listing_job_details read: via parent listing" on public.listing_job_details;

create policy "listing_job_details read: via parent listing" on public.listing_job_details
for select
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_job_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or listings.status = 'active'
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
);

drop policy if exists "listing_job_details write: owner or admin" on public.listing_job_details;

create policy "listing_job_details write: owner or admin" on public.listing_job_details
for all
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_job_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_job_details.listing_id
      and (
        listings.owner_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  )
);
