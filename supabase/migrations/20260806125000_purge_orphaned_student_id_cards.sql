-- Sprint 0 / P0-2 (continued) — remove ID cards belonging to deleted accounts.
--
-- ⚠️  THIS MIGRATION IS IRREVERSIBLE AND DELETES DATA. It is kept in its own
--     file, separate from 20260806123000, so it can be reviewed, deferred or
--     skipped on its own. Every other migration in this sprint is a
--     permission change and can be rolled back.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-2): storage.objects holds 25 rows
-- in student-id-cards across 25 distinct owner uuids, while public.profiles
-- holds 6 rows. src/app/api/admin/delete-user/route.ts deletes the profile
-- row and calls auth.admin.deleteUser(), but has never removed the uploaded
-- card — so 19 people who deleted their account still have their ID document
-- stored, and (until 20260806123000) publicly served.
--
-- Making the bucket private already ends the exposure. This goes further and
-- removes the data, because once the owning account is gone there is no
-- verification left to perform and therefore no lawful basis to keep an
-- identity document.
--
-- The route is fixed in the same sprint so no new orphans accumulate.
--
-- ── SCOPE OF THIS DELETE ─────────────────────────────────────────────────
-- Deleting the storage.objects row is what removes the object from the
-- Storage API: every read path (public URL, signed URL, download, list)
-- resolves through this table, so an object with no row here is unreachable.
-- The underlying blob in the storage backend is NOT reclaimed by this
-- statement. To reclaim the bytes as well, run afterwards, once:
--
--   supabase storage rm --experimental -r ss:///student-id-cards/<uuid>
--
-- for each purged uuid, or delete the orphaned folders from
-- Dashboard → Storage → student-id-cards. Unreachable is enough for the
-- security property; the follow-up is about cost and data minimisation.
--
-- ── BEFORE RUNNING ───────────────────────────────────────────────────────
-- Take an inventory so the purge is auditable after the fact — this is the
-- only record that will survive it:
--
--   select name, owner, created_at, metadata->>'size' as size
--   from storage.objects
--   where bucket_id = 'student-id-cards'
--     and (storage.foldername(name))[1] not in (select id::text from public.profiles);
--
-- Expected: 19 rows against the audit snapshot of 2026-08-06. If the count
-- differs materially, stop and re-check before proceeding — it means the
-- account set moved after the audit.

delete from storage.objects
where bucket_id = 'student-id-cards'
  -- Guard against a malformed path: (storage.foldername(name))[1] is text and
  -- may not be a uuid at all, so compare as text rather than casting, which
  -- would raise on the first bad row and abort the whole statement.
  and (storage.foldername(name))[1] not in (
    select id::text from public.profiles
  );

-- Verification:
--   select count(*) from storage.objects
--   where bucket_id = 'student-id-cards'
--     and (storage.foldername(name))[1] not in (select id::text from public.profiles);
--     -> 0
--
--   select count(*) from storage.objects where bucket_id = 'student-id-cards';
--     -> 6 (one per surviving profile, against the audit snapshot)
--
--   Every remaining profile with a card still resolves through the admin
--   signed-URL route: POST /api/admin/student-id-card -> 200.
