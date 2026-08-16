-- Sprint 0 / P0-5 — Any signed-in user can overwrite or delete any listing's
-- photos, and upload anything into any bucket.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-5). Verified live:
--
--   "Authenticated users can upload room images"
--     INSERT | {authenticated} | with_check: (bucket_id = 'room-images')
--   "Authenticated users can update room images"
--     UPDATE | {authenticated} | using:      (bucket_id = 'room-images')
--   "Authenticated users can delete room images"
--     DELETE | {authenticated} | using:      (bucket_id = 'room-images')
--   "Give users authenticated access to folder 1ied7ze_0"
--     INSERT | {authenticated} | with_check: (bucket_id = 'room-images' and auth.role() = 'authenticated')
--   "Allow authenticated uploads 1l4cebn_0"
--     INSERT | {authenticated} | with_check: TRUE          <- EVERY bucket
--
-- None of the room-images policies compares the caller to the room that owns
-- the object, so any verified student can delete a competitor's listing
-- photos or replace them with anything they like. The last policy is worse
-- than the rest: `with_check: true` is not scoped to a bucket at all, so it
-- grants upload into student-id-cards, avatars and content-images too,
-- undercutting the properly-scoped policies those buckets have.
--
-- The `content-images` policy added in 20260731090000 is the shape the rest
-- should have had: it joins the object path back to the owning row. These
-- older policies predate the migration history and were made in the
-- dashboard, so they were never reviewed.
--
-- Fix: drop all five, and replace the room-images write path with one
-- owner-scoped `for all` policy. `${roomId}/${uuid}.webp` is the path both
-- writers use (src/app/post-room/page.tsx:uploadRoomImages and the edit
-- page), and in both flows the rooms row is inserted before any upload is
-- attempted — so owner_id is already set when RLS evaluates the object.
--
-- Public read is intentionally kept: room photos appear on public listing
-- pages that logged-out visitors can browse. Two identical public-read
-- policies existed; one is dropped so only a single policy governs SELECT,
-- per the "one policy per command" rule that 20260702160000_remove_redundant_
-- rooms_visibility_policies.sql established for this codebase.

-- Cross-bucket blanket upload.
drop policy if exists "Allow authenticated uploads 1l4cebn_0" on storage.objects;

-- Unscoped room-images write policies.
drop policy if exists "Authenticated users can upload room images" on storage.objects;
drop policy if exists "Authenticated users can update room images" on storage.objects;
drop policy if exists "Authenticated users can delete room images" on storage.objects;
drop policy if exists "Give users authenticated access to folder 1ied7ze_0" on storage.objects;

-- Duplicate of "Public can view room images" (identical predicate). Dropping
-- the copy, keeping the clearer name.
drop policy if exists "Public image read 1ied7ze_0" on storage.objects;

-- One policy covering insert/update/delete, mirroring the content-images
-- pattern: the first path segment is the room id, and the caller must own
-- that room. Admins are included so listing moderation can remove abusive
-- photos — `rooms` RLS already lets an admin delete the listing row itself
-- ("owner or admin can delete rooms"), so this only makes the storage side
-- match a permission they already have.
drop policy if exists "room-images write: room owner or admin" on storage.objects;

create policy "room-images write: room owner or admin" on storage.objects
for all
to authenticated
using (
  bucket_id = 'room-images'
  and exists (
    select 1 from public.rooms
    where rooms.id::text = (storage.foldername(name))[1]
      and (
        rooms.owner_id = (select auth.uid())
        or exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
)
with check (
  bucket_id = 'room-images'
  and exists (
    select 1 from public.rooms
    where rooms.id::text = (storage.foldername(name))[1]
      and (
        rooms.owner_id = (select auth.uid())
        or exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and role = 'admin'
        )
      )
  )
);

-- Verification:
--   Owner posting a room: insert row, then upload to `${room.id}/<uuid>.webp`
--     -> 200, unchanged behaviour
--   Any other signed-in user, same path:
--     upload / update / remove -> 403
--   Logged-out visitor:
--     GET /storage/v1/object/public/room-images/<roomId>/<file>.webp -> 200
--     (public listing photos still resolve)
--   Blanket upload is gone:
--     upload into 'avatars' under another user's uid -> 403
--   Path whose first segment is not a real room id:
--     upload('not-a-uuid/x.webp') -> 403 (no matching rooms row)
