-- Problem: docs/module-verticals-roadmap.md Sprint 4 -- Books needs to move
-- off the static discovery array onto the real `listings`/`listing_book_details`
-- tables (created empty in 20260724120000_create_listings_foundation.sql),
-- with: (a) a `semester` field per docs/feature-breakdown.md §8.1 that the
-- original foundation migration didn't include, (b) a way for a Books
-- module admin (public.module_admins, 20260730150000) to fully manage every
-- book listing -- not just their own -- per the user's explicit "full edit +
-- delete" decision, and (c) somewhere to store listing photos, since
-- `listings.images` has existed since the foundation migration but no
-- bucket was ever created for it.
--
-- Fix, in three parts:
--
-- 1. `listing_book_details.semester` -- additive column, nullable (existing
--    rows would be none, since this table has never been written to).
--
-- 2. Module-admin bypass policies on `listings` and `listing_book_details`.
--    These are NEW, ADDITIVE permissive policies -- the existing
--    owner/admin policies from 20260724120000 are not edited or dropped.
--    Postgres OR-combines every permissive policy for a given command, so
--    this only ever widens access (to the assigned module admin), never
--    narrows it. `is_module_admin()` already returns true for a global
--    admin too, so this one `for all` policy also covers a books module
--    admin reading an *archived* book by someone else, which the existing
--    "owner, admin, or active" SELECT policy alone would not allow.
--
-- 3. `content-images` storage bucket + `storage.objects` policies -- public
--    read, write restricted to the listing's owner or that listing's
--    module admin. Path convention: `${module}/${rowId}/${uuid}.webp`
--    (module plural, matching `module_admins.module` / route slugs -- see
--    the singular/plural note in docs/module-admin-architecture.md). The
--    listings row is always inserted before any image upload is attempted
--    (same two-step pattern as src/app/post-room/page.tsx's
--    `uploadRoomImages`), so `owner_id` is already set by the time RLS
--    evaluates the upload.
--
--    Unlike `room-images` (created out-of-band via the Supabase dashboard,
--    undocumented in any migration), this bucket ships through a tracked
--    migration so its existence and policies are reviewable in git.

alter table public.listing_book_details add column semester text;

create policy "listings admin: module admin full access" on public.listings
for all
using (public.is_module_admin(listing_type || 's'))
with check (public.is_module_admin(listing_type || 's'));

create policy "listing_book_details admin: module admin full access" on public.listing_book_details
for all
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_book_details.listing_id
      and public.is_module_admin(listings.listing_type || 's')
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_book_details.listing_id
      and public.is_module_admin(listings.listing_type || 's')
  )
);

insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

create policy "content-images read: public" on storage.objects
for select
using (bucket_id = 'content-images');

create policy "content-images write: owner or module admin" on storage.objects
for all
using (
  bucket_id = 'content-images'
  and exists (
    select 1 from public.listings
    where listings.id::text = (storage.foldername(name))[2]
      and (listings.owner_id = auth.uid() or public.is_module_admin(listings.listing_type || 's'))
  )
)
with check (
  bucket_id = 'content-images'
  and exists (
    select 1 from public.listings
    where listings.id::text = (storage.foldername(name))[2]
      and (listings.owner_id = auth.uid() or public.is_module_admin(listings.listing_type || 's'))
  )
);
