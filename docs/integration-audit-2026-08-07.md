# nexUni.living — Integration Audit (2026-08-07)

Scope: schema ↔ RLS ↔ storage ↔ auth ↔ application code consistency.
Method: **live database inspection** (`hktvqwryhpyiujjprymt`, Postgres 17.6) cross-read
against the repository working tree. Nothing below is inferred from migration files
alone — every claim about the database was verified by querying `pg_policies`,
`information_schema.column_privileges`, `pg_proc`, `pg_trigger`, `storage.buckets`
and `storage.objects` directly.

No database change and no application change has been applied by this audit.
This document is the analysis report requested before any changes.

---

## 0. Executive summary

| Severity | Count | Headline |
|---|---|---|
| **P0** | 4 | Repo↔DB migration drift; jobs approval gate bypassable; message forgery; ID-card data loss |
| **P1** | 7 | Email enumeration oracle; `anon` holds UPDATE on every profile column; duplicate student ID; no email verification; booking hold self-extension; roommate report black hole; missing edit UX |
| **P2** | 9 | 30+ redundant RLS policies; missing locality wiring; advisor warnings; storage gaps |

The single most consequential finding is **§1.1 — the repository and the database
have silently diverged again**, in the opposite direction from the drift Sprint 0 was
created to repair. Six migration *versions* are marked applied, but the SQL that ran
is not the SQL now in `supabase/migrations/`. Everything else in this report is
downstream of the same root cause: there is no drift check.

---

## Phase 1 — Database integration audit

### 1.1 P0 — Repo↔DB drift: applied migrations ≠ repository migrations

`supabase_migrations.schema_migrations` records 30 versions. All 23 pre-Sprint-0
migrations now match the repository — **the migration problem you fixed is genuinely
fixed for those.** But three new divergences appeared:

**(a) Sprint 0 was applied from the first-pass patch, not the second-pass files.**
Version numbers match, so `supabase db push` will never re-apply them, and the
difference is invisible forever without a diff check.

| Version | Applied as (in DB) | File now in repo | Applied content |
|---|---|---|---|
| 20260806120000 | `guard_profile_privileged_fields_on_insert` | `..._sprint0_security_hardening_profile_insert.sql` | equivalent ✅ |
| 20260806121000 | `restrict_admin_backfill_university_suggestion` | `..._backfill_rpc.sql` | **differs** — see (b) |
| 20260806122000 | `relock_authenticated_sensitive_columns` | `..._profile_columns.sql` | **differs** — no `public_profiles` view |
| 20260806123000 | `private_student_id_cards_bucket` | `..._id_card_bucket.sql` | equivalent ✅ |
| 20260806124000 | `scope_room_images_storage_policies` | `..._storage_policies.sql` | equivalent ✅ |
| 20260806125000 | `purge_orphaned_student_id_cards` | `..._orphan_purge.sql` | **NO-OP** — see 1.2 |

Verified consequences:

```
to_regclass('public.public_profiles')   -> NULL   (view never created)
to_regclass('public.storage_purge_log') -> NULL   (inventory table never created)
```

**(b)** `admin_backfill_university_suggestion` still carries `authenticated=X` in
`proacl`. The second-pass file revokes it; the applied first-pass version did not.
Not exploitable — the in-body `admin only` guard *is* live — but the Supabase linter
flags it, and repo and reality disagree.

**(c)** Migration `20260805090000_roommate_profiles_admin_moderation` is **applied on
the database but has no file in this repository.** Its body (read from
`schema_migrations.statements`) adds admin UPDATE/DELETE moderation to
`roommate_profiles`. A fresh `supabase db reset` today would produce a database
without it. This is the exact failure mode of the original drift, recurring.

> **Decision needed:** do you have `20260805090000_roommate_profiles_admin_moderation.sql`
> locally? If yes, commit it. If not, I can reconstruct it verbatim from
> `schema_migrations.statements` — it is stored in full.

### 1.2 P0 — All student ID cards are gone from storage

```
select count(*) from storage.objects where bucket_id = 'student-id-cards';  ->  0
select count(*) from profiles where student_id_card_url is not null;        ->  6
```

The purge migration ran as a **no-op** (its own header records why: Supabase-hosted
rejects `delete from storage.objects` for every role including the migration role).
So the 19 orphans were not removed by the migration — but the bucket is now
*completely* empty, including the 6 cards belonging to **live, active accounts**.
Something cleared the bucket outside migrations, most likely a Dashboard bulk delete.

All 6 profiles still hold a stale `student_id_card_url` pointing at
`/storage/v1/object/public/student-id-cards/...`. Consequences:

- `POST /api/admin/student-id-card` will fail to sign every one of them — the object
  does not exist.
- The admin verification screen shows six permanently broken images.
- Operationally the blast radius is small: **all 6 users are already
  `verification_status = 'approved'`**, so no pending verification was lost.

This is not recoverable from here. What *is* fixable is the stale state: null out the
six dead URLs so the admin UI stops promising an image that cannot exist.

### 1.3 New tables — code integration status

| Table | Rows | Used in code | Verdict |
|---|---|---|---|
| `universities` | 10 | `features/universities/{queries,hooks}`, `/universities/[slug]`, `sitemap.ts` | ✅ wired |
| `localities` | 10 | `features/localities/hooks`, `/areas/[slug]`, `sitemap.ts` | ⚠️ read-only — never written |
| `locality_university` | 22 | `/areas/[slug]`, `/universities/[slug]` | ✅ wired |
| `roommate_profiles` | 3 | `/roommates`, `/roommates/new`, `/roommates/[id]` | ⚠️ no edit page |
| `roommate_profile_reports` | 1 | `ReportRoommateProfileButton` | ❌ **write-only — no admin UI** |
| `listings` | 1 | jobs + books pages/admin panels | ⚠️ approval gate bypassable |
| `module_admins` | 4 | `useViewerCapabilities`, `Navbar`, `proxy.ts`, admin page | ✅ wired |

**No table/schema mismatch found** — every column the application selects exists with
a compatible type. The gaps are *behavioural*, not structural.

---

## Phase 2 — RLS security audit

### 2.1 P0 — `listings`: the jobs approval gate can be bypassed by its own author

```
policy  "listings insert: own row"        INSERT  with_check = (auth.uid() = owner_id)
policy  "listings update: owner or admin" UPDATE  qual       = (owner or admin)
                                                  with_check = NULL  ← inherits qual
```

`listings.status` defaults to `'pending'` and `post-job/page.tsx` sends
`status: 'pending'` — but **nothing enforces it**. There is no trigger on `listings`
(verified: `pg_trigger` has zero non-internal triggers for that table). Two working
attacks, both a single REST call with a normal student session:

```
POST /rest/v1/listings   { listing_type:"job", owner_id:<self>, status:"active", ... }
PATCH /rest/v1/listings?id=eq.<own pending job>   { "status": "active" }
```

Either publishes a job listing to every user without an admin ever seeing it. The
entire `20260731120000_jobs_pending_status_and_admin_policy` approval workflow and
`JobsAdminPanel` are decorative against a crafted request.

**Fix:** a corrective migration adding an explicit `WITH CHECK` that pins `status`
for non-admins, plus a `BEFORE INSERT/UPDATE` trigger that forces `'pending'` for
job-type listings written by a non-admin. Policy diff in §9.

### 2.2 P0 — `messages`: the recipient can rewrite what the sender wrote

```
policy "messages_own_update"          UPDATE  qual = (sender_id = uid OR receiver_id = uid)  with_check = NULL
policy "participants can update messages"  UPDATE  qual = (same)                             with_check = NULL
policy "receiver can update message"  UPDATE  qual = (receiver_id = uid)                     with_check = NULL
```

`messages.content` is a plain text column with no trigger. Because `WITH CHECK` is
absent it defaults to `USING`, so any participant may rewrite **any column of a
message they can see**, including one they did not send.

Attack: A rents from B, chats, then edits B's own message to read *"I promise a full
refund"* and screenshots it as evidence. There is no `edited_at`, no audit row, and
`booking_events` does not cover messages — the forgery is undetectable.

The three policies exist only to let a recipient set `is_read = true`. That is the
only legitimate write, and it should be the only permitted one.

### 2.3 P1 — `bookings`: a tenant can extend their own hold forever

```
policy "tenant or owner can update booking"  UPDATE  qual = (tenant OR owner)  with_check = NULL
```

`guard_bookings_status` guards `status` transitions only. `expires_at`, `seats`,
`move_in_date` and `message` are unguarded, so a tenant can `PATCH` their own booking's
`expires_at` to 2099 and hold a seat out of inventory indefinitely, defeating
`auto_cancel_expired_bookings`. With 8 rows today this is theoretical; at scale it is a
denial-of-inventory against every room owner.

### 2.4 P1 — `anon` holds `UPDATE` on all 17 `profiles` columns

```
grantee | privilege | columns
--------+-----------+---------------------------------------------------
anon    | UPDATE    | ALL 17, including role, is_verified, verification_status
```

Not currently exploitable: every `profiles` UPDATE policy keys on `auth.uid() = id`,
which is `NULL` for `anon`, so zero rows match. But this is a live landmine — the day
anyone adds a permissive update policy, unauthenticated users get write access to the
role column. `anon` has no legitimate reason to hold `UPDATE` on this table at all.

`authenticated` likewise holds UPDATE on `role`, `is_verified`, `verification_status`.
There the `prevent_self_privilege_escalation` trigger *is* the control and it is
correctly written — but a column revoke is a stronger, cheaper primitive than a
trigger, and it is defence-in-depth the trigger cannot provide if it is ever dropped.

### 2.5 P1 — `roommate_profiles`: publishing is not re-checked against verification

```
INSERT  with_check = (uid = user_id AND EXISTS(profiles … verification_status='approved'))  ✅
UPDATE  with_check = (uid = user_id OR admin)                                               ⚠️
```

Verification is checked at insert but **not at publish**. `/roommates/new`
`handlePublish()` sets `status = 'active'` via UPDATE. So a student who was approved,
created a draft, and was later rejected or had verification revoked can still publish
an active roommate profile to the whole board.

Separately, the create wizard does not check `verification_status` in the UI at all, so
an unverified student clicking "Create Profile" receives the raw Postgres string
`new row violates row-level security policy for table "roommate_profiles"`.

### 2.6 P2 — 30+ redundant permissive policies

Duplicate policies from the pre-migration era were never cleaned up. Permissive
policies are **OR-combined**, so the loosest one always wins and a correct narrow
policy is silently neutralised by a broad sibling — exactly the hazard documented in
`20260702160000_remove_redundant_rooms_visibility_policies.sql`.

| Table | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|
| `bookings` | 4 | 5 | 4 | — |
| `messages` | 4 | 3 | 4 | — |
| `profiles` | 3 | 2 | 3 | 1 |
| `rooms` | 3 | 1 | 3 | 3 |
| `saved_rooms` | 1 + `ALL` | 1 | — | 1 |
| `reports` | 1 | 3 | 1 | 1 |

Beyond the review hazard this is a measurable per-row cost on every query. Reducing
each set to one policy is mechanical and behaviour-preserving *if* the union is
computed correctly — I would do it one table per commit with the union proved in the
migration header, not in a single sweep.

Also note: `profiles` SELECT carries `public can view profiles` with `qual = true`.
Row-level exposure is total; only the Sprint 0 column allowlist limits the damage. The
`public_profiles` view (§1.1a) that would make this explicit was never created.

### 2.7 Access-control questions, answered

**Can a normal user read another user's private data?**
No longer, for `profiles` — the Sprint 0 column revoke **is live and verified**:

```
authenticated SELECT -> id, full_name, avatar_url, phone, university, university_id,
                        gender, is_verified, verification_status, role, locale, created_at
```

`email`, `student_id`, `bkash_number`, `nagad_number`, `student_id_card_url` are gone.
Cross-user reads of `messages`, `bookings`, `saved_rooms`, `reports` are all correctly
scoped. **Exception:** any email can be recovered via the RPC in §3.2.

**Can an unverified user perform restricted actions?**
Mostly no — `roommate_profiles` INSERT requires approval, and `/post-job` / `/post-book`
check `verification_status` client-side. Two holes: publish-after-revocation (§2.5),
and the client-side-only check on posting listings (the RLS INSERT policy on `listings`
does **not** require verification, so `POST /rest/v1/listings` works for an unverified
user directly).

**Does admin get the access it needs?**
Yes. `admin_list_profiles` (SECURITY DEFINER + admin guard), the `/api/admin/*`
service-role routes, and admin arms on every moderation policy all function. Module
admins are correctly scoped by `is_module_admin()` in both `proxy.ts` and RLS.

---

## Phase 3 — Authentication flow audit

### 3.1 P1 — Email verification is disabled

```
select count(*), count(*) filter (where confirmation_sent_at is not null) from auth.users;
 -> 6 users, 0 confirmations ever sent
```

Every account is auto-confirmed. `supabase.auth.signUp()` in
`src/app/auth/register/page.tsx:126` passes no `emailRedirectTo`. Nothing proves the
registrant controls the address they typed. Anyone can register using a real student's
email, and that address then receives all platform notifications.

The admin ID-card review partially compensates — but the card is only checked *after*
the account and the profile row already exist.

> **Trade-off worth naming:** turning email confirmation on will break the current
> registration flow, because the profile `INSERT` at `register/page.tsx:154` runs
> client-side immediately after `signUp()`. With confirmation on there is no session at
> that moment, `auth.uid()` is `NULL`, and the RLS INSERT policy rejects the row — the
> user ends up with an auth account and no profile. The correct fix is to move profile
> creation to an `auth.users` `AFTER INSERT` trigger (`handle_new_user`), which is the
> Supabase-standard pattern and was already deferred to Sprint 3 in the Sprint 0 doc.
> **Enabling confirmation and building the trigger must ship together.**

### 3.2 P1 — `get_email_by_student_id` is an unauthenticated email-harvest oracle

```
prosecdef: true            proacl: anon=X, authenticated=X, service_role=X
```

Used legitimately by `/auth/login` for "log in with Student ID". But it is callable by
anyone holding the public anon key, unmetered:

```
POST /rest/v1/rpc/get_email_by_student_id  { "p_student_id": "21-44001-1" }
 -> "student@example.com"
```

Bangladeshi student IDs are structured and enumerable (`YY-NNNNN-S`). A loop over one
university's ID space harvests the email of every registered student — the raw material
for targeted phishing against exactly the population this platform serves. It also
doubles as a registration oracle (which IDs exist).

This cannot simply be revoked: it powers a shipped feature. It needs to move behind a
server route with rate limiting, so the login page keeps working while bulk enumeration
does not.

### 3.3 P1 — The duplicate-Student-ID check has never worked

`register/page.tsx:114`:

```ts
const { data: existingStudent } = await supabase
  .from('profiles').select('id').eq('student_id', form.student_id).single()
```

Run as `anon`, and `student_id` is **not** in anon's SELECT grant (excluded since
`20260702170000`). PostgREST answers `403 permission denied for column student_id`.
The `error` is discarded, `data` is `null`, `existingStudent` is falsy — **the check
always passes.** Two people can register the same student ID, at which point
`get_email_by_student_id` becomes non-deterministic about whose account you log into.

Pre-dates Sprint 0; Sprint 0 neither caused nor fixed it.

### 3.4 Session, middleware and route protection — ✅ correct

`src/proxy.ts` is the strongest part of the auth stack:

- uses `supabase.auth.getUser()` (server-revalidated) rather than `getSession()`
  (cookie-trusting) — the right call, and correctly commented.
- `PROTECTED_ROUTES` = `/dashboard`, `/post-room`, `/post-book`, `/post-job`, `/inbox`,
  `/profile`; `ADMIN_ROUTES` = `/admin`. Matcher config matches the route lists exactly.
- Admin gate re-reads `role` from the database on every request, then falls back to a
  narrow per-module `module_admins` lookup. No JWT-claim trust anywhere.
- `next=` destination preserved on redirect; logged-in users bounced off auth pages.

Verified against your Phase 3 list: `/dashboard` ✅ `/profile` ✅ `/post-room` ✅
`/admin` ✅ — all four redirect an unauthenticated visitor to `/auth/login`, and
`/admin` additionally redirects a non-admin to `/dashboard`.

**One gap:** `/roommates/new` is not in `PROTECTED_ROUTES`. It self-redirects client-side,
so there is no data exposure (RLS still applies), but it is the only authenticated
write surface not covered by the middleware — inconsistent, and it flashes the form
before redirecting.

---

## Phase 4 — University + locality feature

| Requirement | Status |
|---|---|
| Student profile — university select | ✅ `UniversityCombobox` in `/profile` and `/auth/register` |
| Student profile — **locality select** | ❌ **`profiles` has no `locality_id` column** |
| Room posting — university relation | ⚠️ indirect only |
| Room posting — locality relation | ❌ **`/post-room` never sets `locality_id`** |
| Nearest-university calculation | ✅ `set_room_nearest_universities` trigger on lat/lng |

Live data confirms the gap:

```
rooms total                          8
rooms with locality_id             > 0        ->  0
rooms with nearest_university_ids  > 0        ->  1
profiles with university_id                   ->  3 / 6
```

`rooms.locality_id` exists, `localities` has 10 rows, `/areas/[slug]` renders rooms by
locality — and **not one room has ever been assigned one**, because the post-room
wizard has no locality picker. It only collects a free-text `university_priority`
string. Every `/areas/*` page is therefore permanently empty, and the
`locality_university` join table (22 rows) has no rooms to connect.

`nearest_university_ids` is populated correctly by the trigger, but only 1 of 8 rooms
has coordinates, so the university→rooms path is nearly as empty.

To close Phase 4 as specified, `profiles` needs a `locality_id` column (new migration),
and `/post-room` plus `/profile` each need a locality select.

---

## Phase 5 — Roommate profile feature

Fields — all present in `roommate_profiles` and all collected by the wizard:
`bio` ✅ `gender` ✅ `age` ✅ `university_id` ✅ `locality_id` ✅
`budget_min`/`budget_max` ✅ `sleep_schedule` ✅ `cleanliness_level` ✅
`smoking_preference` ✅ `guest_preference` ✅ `preferred_gender` ✅
`preferred_university_id` ✅

| Page | Status |
|---|---|
| Create | ✅ `/roommates/new` — 3-step wizard, draft persisted from step 1 |
| **Edit** | ⚠️ **no dedicated page** — `/roommates/new` doubles as the editor |
| Public discovery | ✅ `/roommates` — filters, match score, gender rules |
| Detail | ✅ `/roommates/[id]` |

The wizard *does* load an existing row and update it, and `/roommates` correctly
labels the button "Edit My Profile" when one exists. Functionally editing works. What
is wrong is the presentation: the page heading still reads **"Create Roommate
Profile"** and the progress bar still says "Step 1 of 3" when you are editing a
published profile. There is also no edit entry point from `/roommates/[id]` or the
dashboard.

Security — "only verified users can publish an active roommate profile": **enforced at
INSERT, not at publish.** See §2.5.

---

## Phase 6 — Report system

| Requirement | Status |
|---|---|
| Report button | ✅ `ReportRoommateProfileButton` |
| Modal / form | ✅ |
| Reason selection | ✅ Fake profile / Inappropriate content / Harassment / Spam / Other |
| Duplicate protection | ✅ unique constraint, handled as `23505` with a friendly message |
| **Admin review page** | ❌ **does not exist** |
| Status: pending / reviewed / dismissed | ⚠️ schema + RLS ready, no UI |

`/admin/reports/page.tsx` reads `public.reports` only — the *room* report table. It
never touches `roommate_profile_reports`. RLS is already correct
(`insert: own reporter_id only`, `read: own or admin`, `update: admin only`) and
`20260805090000` already granted admins moderation rights on `roommate_profiles`
itself. **Everything is in place except the screen.** There is 1 real report sitting in
the table right now that no human being can see.

This is the cleanest, highest-value item in the whole audit: pure additive UI, no
schema change, no policy change, no risk to existing features.

---

## Phase 7 — Storage audit

```
bucket             public  size limit  allowed mime
-----------------  ------  ----------  ----------------------------------
student-id-cards   false   5 MiB       image/webp, image/jpeg, image/png
avatars            true    5 MiB       image/webp, image/jpeg, image/png
content-images     true    5 MiB       image/webp, image/jpeg, image/png
room-images        true    5 MiB       image/webp, image/jpeg, image/png
```

**`student-id-cards` — ✅ correct.**
- Private ✅
- `insert: own folder only` — `(storage.foldername(name))[1] = auth.uid()::text` ✅
- `read: owner or admin` ✅
- No UPDATE or DELETE policy → default deny ✅ (but see gap below)
- Served exclusively through `POST /api/admin/student-id-card` (admin-gated, rate
  limited, 300-second signed URL) ✅

Gap: with no UPDATE/DELETE policy a student **cannot replace a rejected ID card** —
re-uploading to a fresh random path works, but the old object is orphaned forever and
`student_id_card_url` is overwritten, so it becomes invisible and unreclaimable. Given
§1.2 wiped the bucket, re-upload is now the *only* path back to a working verification
flow for these users.

**`room-images` — ✅ correct for a public bucket.**
- `Public can view room images` (SELECT, bucket-scoped) — appropriate, listings are public
- `room-images write: room owner or admin` (ALL) joins `(storage.foldername(name))[1]`
  to `rooms.id` ✅
- Ordering verified safe: `post-room/page.tsx:281` creates the room row *before*
  `uploadRoomImages(room.id)`, so the policy's `EXISTS(rooms …)` always resolves.

**`avatars` — ⚠️ two gaps.** INSERT and UPDATE are scoped to the user's own folder, but
there is **no DELETE policy**, so old avatars accumulate permanently. And the bucket is
public with a `qual = (bucket_id = 'avatars')` read policy, meaning avatar URLs are
guessable-by-listing for anyone with the anon key.

**`content-images` — ✅** write scoped via `(storage.foldername(name))[2]` → `listings.id`
with an owner-or-module-admin check.

---

## Phase 8 — Testing baseline

`npx eslint .` — run now, before any change:

```
✖ 19 problems (0 errors, 19 warnings)
```

16 × `@next/next/no-img-element`, 3 × `no-unused-vars`. **Zero errors.** Identical to
the pre-Sprint-0 baseline; nothing in this audit introduced a warning. `npm run build`
last passed in 82 s with `/api/admin/student-id-card` registered.

I will re-run lint **and** build after any change and paste both outputs verbatim, per
Hard Rule 7.

---

## Supabase advisor cross-check

Independent confirmation of several findings above, plus hygiene items:

| Advisor | Finding |
|---|---|
| `authenticated_security_definer_function_executable` | `admin_backfill_university_suggestion` — confirms drift §1.1b |
| `anon_security_definer_function_executable` | `get_email_by_student_id` — confirms §3.2 |
| `anon_security_definer_function_executable` | `admin_list_profiles`, `admin_list_university_suggestions`, `admin_list_dismissed_university_suggestions` — anon-callable; each has an in-body admin guard, so not exploitable, but EXECUTE should be revoked |
| `anon_security_definer_function_executable` | 4 **trigger** functions (`force_profile_defaults_on_insert`, `prevent_self_privilege_escalation`, `guard_booking_status_transitions`, `set_room_nearest_universities`) are exposed as RPCs. Calling a trigger function directly raises `trigger functions can only be called as triggers`, so harmless — but they should not be on the public API surface |
| `function_search_path_mutable` | 7 functions. **All 7 verified `prosecdef = false`**, so they run as the caller and the escalation vector does not apply. Low severity, worth fixing for cleanliness |
| `extension_in_public` | `pg_trgm` in `public`. Low |
| `auth_leaked_password_protection` | **Disabled.** HaveIBeenPwned checking is off. This is a dashboard toggle — **you must enable it**, I cannot |

---

## 9. Proposed corrective migrations — before / after

Per Hard Rules 1–3: **no existing migration file will be edited**; every change below is
a new, additive migration. Nothing here has been applied.

### M1 — `listings` status integrity (fixes §2.1, P0)

```diff
  policy "listings insert: own row"           INSERT
- with_check = (auth.uid() = owner_id)
+ with_check = (auth.uid() = owner_id AND (status = 'pending' OR is_admin_or_module_admin))

  policy "listings update: owner or admin"    UPDATE
  qual       = (auth.uid() = owner_id OR admin)
- with_check = NULL                    -- inherits qual, status unconstrained
+ with_check = (auth.uid() = owner_id OR admin)
+              AND (status = OLD.status  -- enforced by trigger, not expressible in WITH CHECK
+                   OR admin)
```

Because `WITH CHECK` cannot reference `OLD`, the status pin needs a
`BEFORE INSERT OR UPDATE` trigger — same pattern as the existing
`guard_booking_status_transitions`. **Behaviour change:** a book listing currently
publishes instantly (`post-book` sends `status:'active'`); pinning to `'pending'`
would put books behind approval too. **Decision needed:** should books stay
instant-publish while jobs require approval? I will preserve current behaviour
per-`listing_type` unless you say otherwise.

### M2 — `messages` write scope (fixes §2.2, P0)

```diff
- policy "messages_own_update"              UPDATE  qual = (sender OR receiver)  with_check = NULL
- policy "participants can update messages" UPDATE  qual = (sender OR receiver)  with_check = NULL
- policy "receiver can update message"      UPDATE  qual = (receiver)            with_check = NULL
+ policy "messages update: recipient marks read"  UPDATE
+   qual       = (auth.uid() = receiver_id)
+   with_check = (auth.uid() = receiver_id)
+ -- plus a BEFORE UPDATE trigger rejecting any change to
+ -- content / sender_id / receiver_id / room_id / created_at
```

Verified safe: the only `messages` UPDATE anywhere in `src/` sets `is_read`.

### M3 — `bookings` field integrity (fixes §2.3, P1)

Extend `guard_booking_status_transitions` (new function version, existing migration
untouched) to also reject non-admin changes to `expires_at`, `room_id`, `user_id`,
`seats`.

### M4 — revoke `anon` write access to `profiles` (fixes §2.4, P1)

```diff
- anon          UPDATE  on all 17 columns
+ (revoked entirely — anon has no write path to profiles)
- authenticated UPDATE  on role, is_verified, verification_status
+ (revoked; the other 14 columns keep their grant)
```

Verified no-op for the application: `/profile` updates only `full_name`, `phone`,
`university`, `university_id`, `avatar_url`, `bkash_number`, `nagad_number`, `locale`.
Admin role changes go through the service-role route `/api/admin/update-user`, which
bypasses grants. The `prevent_self_privilege_escalation` trigger stays as the second layer.

> Note the Postgres semantics that bit us in `20260702170000`: a column privilege
> cannot be revoked if the grant was made at table level. The migration must
> `REVOKE UPDATE ON profiles` then `GRANT UPDATE (…14 columns…)`.

### M5 — `roommate_profiles` publish gate (fixes §2.5, P1)

```diff
  policy "roommate_profiles update: own row or admin"  UPDATE
  qual       = (auth.uid() = user_id OR admin)
- with_check = (auth.uid() = user_id OR admin)
+ with_check = (admin
+               OR (auth.uid() = user_id
+                   AND (status <> 'active'
+                        OR EXISTS (select 1 from profiles
+                                   where id = auth.uid()
+                                     and verification_status = 'approved'))))
```

### M6 — revoke EXECUTE on internal/admin functions (advisor hygiene)

Revoke from `anon` + `authenticated`: the 4 trigger functions, and the 3 `admin_list_*`
functions from `anon`. Re-apply the second-pass revoke on
`admin_backfill_university_suggestion` (repairs §1.1b).

### M7 — `profiles.locality_id` (enables Phase 4)

New nullable `uuid` column referencing `localities(id)`, added to the `authenticated`
and `anon` SELECT allowlists and the `authenticated` UPDATE allowlist.

### M8 — clear the six dead `student_id_card_url` values (§1.2)

`update profiles set student_id_card_url = null where student_id_card_url is not null;`
Log the previous values into a small table first, so the loss is recorded rather than
silently erased.

### M9 — reconcile the missing `20260805090000` file (§1.1c)

File-only; no SQL runs against the database.

---

## 10. Proposed application changes

| # | File | Change | Fixes |
|---|---|---|---|
| A1 | `src/app/admin/roommate-reports/page.tsx` *(new)* | Admin review screen: list reports, view target profile, set pending/reviewed/dismissed, deactivate profile | Phase 6 |
| A2 | `src/app/admin/layout.tsx` | Nav entry for A1 | Phase 6 |
| A3 | `src/app/auth/register/page.tsx` | Route the duplicate-student-ID check through a rate-limited server endpoint instead of a query that always 403s | §3.3 |
| A4 | `src/app/api/auth/lookup-student-id/route.ts` *(new)* | Server route wrapping `get_email_by_student_id`, rate limited; RPC then revoked from `anon` | §3.2 |
| A5 | `src/app/auth/login/page.tsx` | Call A4 instead of the RPC directly | §3.2 |
| A6 | `src/app/post-room/page.tsx` | Locality `<select>`, writes `rooms.locality_id` | Phase 4 |
| A7 | `src/app/profile/page.tsx` | Locality `<select>`, writes `profiles.locality_id` | Phase 4 |
| A8 | `src/app/roommates/new/page.tsx` | Heading/step copy switches to edit mode when a row exists; verification pre-check with a readable message instead of the raw RLS error | Phase 5, §2.5 |
| A9 | `src/app/roommates/[id]/page.tsx` | "Edit my profile" link for the owner | Phase 5 |
| A10 | `src/proxy.ts` | Add `/roommates/new` to `PROTECTED_ROUTES` and the matcher | §3.4 |
| A11 | `src/app/admin/users/page.tsx` | Distinguish "ID card missing from storage" from "still loading" | §1.2 |

---

## 11. Recommended order

**Batch 1 — P0 containment** (M1, M2, M6, M9). Pure security, no UX surface, no product
decision needed except the books/jobs question in M1.

**Batch 2 — auth integrity** (M4, A3, A4, A5, §3.1 discussion). Closes the enumeration
oracle and the duplicate-ID hole. Email verification is *discussed* here but not enabled
until the `handle_new_user` trigger exists.

**Batch 3 — Phase 6** (A1, A2). Highest value per unit of risk; entirely additive.

**Batch 4 — Phase 4 + 5** (M3, M5, M7, M8, A6–A11).

---

## 12. What I need from you before applying anything

1. **`20260805090000_roommate_profiles_admin_moderation.sql`** — do you have this file
   locally, or should I reconstruct it from `schema_migrations.statements`?
2. **M1 books vs jobs** — should book listings also go behind admin approval, or stay
   instant-publish?
3. **§1.2 ID cards** — confirm the bucket was cleared deliberately. If it was not, stop
   and investigate before I null the six URLs.
4. **§3.1 email verification** — do you want the `handle_new_user` trigger built now
   (it is a prerequisite), or deferred?
5. **Apply method** — you have write access to the database via migrations now. Should I
   apply migrations directly to the live project, or continue producing files + patches
   for you to apply yourself?

## 13. What only you can do

- Enable **leaked password protection** (Dashboard → Authentication → Policies).
- Enable **email confirmation** — but only after the `handle_new_user` trigger ships
  (§3.1), or every new registration will end up with no profile row.
- Confirm the storage state in §1.2.
