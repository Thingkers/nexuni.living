-- Sprint 0 / P0-2 — 25 student ID cards readable by anyone on the internet.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-2). Verified live:
--
--   storage.buckets: student-id-cards | public = TRUE
--                    file_size_limit = NULL | allowed_mime_types = NULL
--   storage.objects: 25 objects, 25 distinct owners  (public.profiles has 6)
--   object paths:    every one is "<profile-uuid>/id-card.webp"
--   anon grant:      profiles.id is anon-readable, RLS qual = true
--
-- Chained, those give a complete unauthenticated harvest:
--   1. GET /rest/v1/profiles?select=id             -> every user's uuid
--   2. GET /storage/v1/object/public/student-id-cards/<uuid>/id-card.webp
-- A public bucket serves straight from the CDN, so step 2 never consults
-- RLS at all. src/lib/compressImage.ts always re-encodes to .webp, so the
-- filename is not a guess — it is a constant.
--
-- The bucket's own read policy is misnamed rather than protective:
--   "Allow users to read own id cards" | SELECT | using (bucket_id = 'student-id-cards')
-- There is no owner comparison, so even with a private bucket every signed-in
-- user could read every card.
--
-- 25 owners against 6 profiles also means 19 cards belong to accounts that
-- were already deleted: /api/admin/delete-user removes the profile row and
-- the auth user but has never touched storage. Those are purged in
-- 20260806125000 (kept separate — it is the one irreversible step in this
-- sprint).
--
-- Fix, four parts:
--
-- 1. Bucket goes private. This is the change that actually stops the bleeding;
--    everything else is depth behind it.
--
-- 2. Size and MIME allowlists on all four buckets. None had either, so any
--    authenticated user could upload a file of any type and any size —
--    unbounded storage cost, and arbitrary content served from the project's
--    own supabase.co origin.
--
-- 3. Real owner scoping on the student-id-cards policies, replacing the two
--    bucket-wide ones. Upload is confined to the caller's own folder so one
--    user cannot plant or overwrite a card in someone else's; read is owner
--    or global admin.
--
-- 4. Admins stop reading the object directly and go through a short-lived
--    signed URL minted server-side (src/app/api/admin/student-id-card/route.ts,
--    same sprint). The admin read policy below is what makes a signed URL the
--    *only* remaining path for anyone else: with the bucket private and no
--    public policy, an unsigned request has nothing to match.
--
-- BREAKING, and handled in this sprint: profiles.student_id_card_url has
-- always held a fully-qualified public URL. Those URLs stop resolving the
-- moment the bucket goes private. The API route normalises both shapes — a
-- legacy absolute URL and the bare storage path new registrations now store —
-- so existing rows keep working without a data migration.

update storage.buckets
set public = false,
    file_size_limit = 5242880,                                   -- 5 MB
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'student-id-cards';

-- Same limits for the rest. These stay public (listing photos, avatars and
-- listing images are meant to be publicly viewable) — only the size/type
-- ceiling is new.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id in ('room-images', 'avatars', 'content-images');

-- BEFORE (both bucket-wide, neither compares the caller to the object):
--   "Allow authenticated users to upload id cards"
--     INSERT | {authenticated} | with_check: (bucket_id = 'student-id-cards')
--   "Allow users to read own id cards"
--     SELECT | {authenticated} | using:      (bucket_id = 'student-id-cards')
drop policy if exists "Allow authenticated users to upload id cards" on storage.objects;
drop policy if exists "Allow users to read own id cards" on storage.objects;

-- AFTER: first path segment must be the caller's own uid. Matches the
-- `${userId}/...` convention the register page already writes, and the same
-- storage.foldername() idiom the avatars policies and the content-images
-- policy from 20260731090000 use.
drop policy if exists "student-id-cards insert: own folder only" on storage.objects;

create policy "student-id-cards insert: own folder only" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-id-cards'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Owner or global admin. Admin is included so a signed-in admin can still
-- reach the object directly if the signed-URL route is ever unavailable;
-- normal admin review goes through the route.
drop policy if exists "student-id-cards read: owner or admin" on storage.objects;

create policy "student-id-cards read: owner or admin" on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-id-cards'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  )
);

-- No UPDATE or DELETE policy: default deny. A student replacing their ID card
-- uploads a new object under a fresh random filename rather than overwriting,
-- so nothing in the app needs either verb, and an ID card should not be
-- silently replaceable after an admin has reviewed it.

-- Verification:
--   Anonymous:
--     GET /storage/v1/object/public/student-id-cards/<uuid>/id-card.webp
--       -> 400 Bucket not found / not public
--   Signed-in student A, against student B's card:
--     supabase.storage.from('student-id-cards').download('<B-uuid>/...')
--       -> 403
--   Signed-in student A, against their own card: -> 200
--   Admin, via POST /api/admin/student-id-card: -> 200 with a signed URL
--     that expires (default 300s); re-request after expiry -> 400.
--   Upload outside your own folder:
--     upload('<someone-else-uuid>/x.webp') -> 403 (new row violates RLS)
--   Oversized / wrong type:
--     upload a 10 MB file or a .pdf -> 413 / 415 from the storage API
