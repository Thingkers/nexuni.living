-- Problem: docs/module-verticals-roadmap.md Sprint 5 -- Jobs needs to move
-- off the static discovery array onto the real `listings`/`listing_job_details`
-- tables, same as Books did in Sprint 4. Unlike Books, docs/feature-breakdown.md
-- §11.1 requires moderator/module-admin approval before a job goes public, so
-- `listings.status` needs a third value: `'pending'`.
--
-- Fix, in two parts:
--
-- 1. Widen `listings_status_check` (the auto-named constraint from
--    20260724120000_create_listings_foundation.sql's inline `check`) to
--    allow `'pending'` alongside the existing `'active'`/`'archived'`. This
--    is shared across both listing_type values, but only the Jobs posting
--    flow (`src/app/post-job/page.tsx`) ever inserts `'pending'` -- Books
--    keeps inserting `'active'` directly (instant-live, per the roadmap's
--    locked scope decision), so this is a pure widening with no behavior
--    change for existing Books rows or policies. The existing "listings
--    read: owner, admin, or active" SELECT policy already keeps a pending
--    row hidden from everyone except its owner and a global/module admin
--    (via the Sprint 4 "listings admin: module admin full access" policy),
--    with no changes needed there.
--
-- 2. Add the `listing_job_details` module-admin bypass policy, mirroring
--    Sprint 4's `listing_book_details` sibling policy exactly -- the base
--    owner/admin/active-read and owner/admin-write policies for
--    `listing_job_details` already exist from the foundation migration.

alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('active', 'archived', 'pending'));

create policy "listing_job_details admin: module admin full access" on public.listing_job_details
for all
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_job_details.listing_id
      and public.is_module_admin(listings.listing_type || 's')
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_job_details.listing_id
      and public.is_module_admin(listings.listing_type || 's')
  )
);
