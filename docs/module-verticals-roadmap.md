# Dynamic Facilities + Module-Scoped Admins — Sprint Roadmap

Tracks turning Books, Local Services, Jobs, and Transport from static preview
pages into real, database-backed, image-card listings, each assignable to
its own module admin. See `docs/module-admin-architecture.md` for the
module-admin design, `docs/listings-architecture.md` for the existing
`listings` foundation this builds on.

**Execution rule: strictly sequential.** Do not start sprint N+1 until every
box in sprint N is checked and its verification steps have actually been
run (not just planned). Payments is out of scope for this roadmap — it
stays a static ledger-preview page.

Two scope decisions locked in before Sprint 1 started:
- **Books stays instant-live** on posting (matches current Rooms UX and
  `docs/feature-breakdown.md` §8, which never mentions approval for Books).
  Only **Jobs** gets a `pending`-until-approved gate (§11.1 requires
  moderator approval before publish).
- **Module admins get full edit + delete** on their module's content (not
  just approve/archive) — RLS for module admins uses `for all`, not an
  update-only policy.

---

## Sprint 1 — Module-admin assignment schema (foundation, no UI)

**Goal:** `module_admins` table + `is_module_admin()` helper exist and are
verified directly via SQL. Nothing in the app reads them yet.

- [x] Migration: `module_admins` table, RLS (self-read + admin-write),
      `is_module_admin(p_module text)` helper function.
- [x] `docs/module-admin-architecture.md` design note.
- [x] Verify: as a test user with a `module_admins` row for `'books'`,
      `select public.is_module_admin('books')` → `true`,
      `select public.is_module_admin('jobs')` → `false`.
- [x] Verify: inserting `module` outside the four allowed values is
      rejected by the check constraint.
- [x] Verify: as a plain student, `select * from module_admins` returns
      zero rows; as the global admin, all rows are visible.
- [x] `npm run build` + `npm run lint` clean (output shown).
- [x] Confirm via diff that no existing migration file was touched.
- [x] Commit.

> **Note:** while applying this sprint, a background planning agent was
> found to have already created these exact objects (table, indexes, RLS
> policies, function) directly on the live Supabase project, outside any
> tracked migration. The schema was verified byte-identical to this
> sprint's migration file, the table was empty (no data written), and per
> user decision it was reconciled by registering a
> `supabase_migrations.schema_migrations` row for this migration rather
> than dropping and recreating. Flagging here for visibility — this should
> not happen again; planning/design agents must stay read-only against live
> infrastructure.

---

## Sprint 2 — Admin routing + assignment UI

**Depends on:** Sprint 1.

**Goal:** A global admin can assign/unassign module admins; `src/proxy.ts`
lets a module admin into their own `/admin/<module>` slice; a placeholder
page exists at each of the four new admin routes.

- [x] Extend `src/proxy.ts` with a `MODULE_ADMIN_ROUTE_PREFIXES` branch
      inside the existing `isAdmin && user` block — the global-admin and
      public-route branches stay byte-for-byte unchanged.
- [x] Extend `src/components/auth/useViewerCapabilities.ts` with a
      `moduleAdmin: AdminModuleKey[]` field (reads `module_admins` for the
      current user).
- [x] Create `src/app/admin/layout.tsx` — first shared admin shell in the
      repo; nav shows all sections to `isAdmin`, only the matching
      section(s) to a module admin.
- [x] Create `src/app/admin/module-admins/page.tsx` — global-admin-only:
      assign/unassign a profile to a module.
- [x] Create `src/app/admin/[module]/page.tsx` — validates `module` against
      the four allowed values (404 otherwise); placeholder content for now,
      filled in per-vertical in Sprints 4–7.
- [x] Reconcile the existing hardcoded admin links in
      `src/components/layout/Navbar.tsx` (desktop + mobile) with the new
      layout/nav — avoid duplicating the same links in two places.
      *(Kept the existing global-admin block untouched and added a second,
      parallel conditional block per menu for module-admin-only users,
      rather than merging both into one shared component — smaller diff,
      zero risk to the existing admin menu.)*
- [x] Verify: as a global admin, assign a second test account to `'books'`;
      confirm the row lands in `module_admins`.
- [x] Verify: as that second account, `/admin/books` loads, `/admin/services`
      redirects to `/dashboard`, `/admin/users` redirects to `/dashboard`.
- [x] Verify: as a plain student, all `/admin/*` routes redirect.
- [x] Verify: existing global-admin flows (`/admin/users`, `/admin/rooms`,
      `/admin/reports`) still work unchanged for a `role='admin'` account.
- [x] `npm run build` + `npm run lint` clean.
- [x] Commit.

> **Verification note:** all four account-type scenarios above were tested
> live over real HTTP with a real authenticated session — not just SQL
> simulation. A disposable test account was created through the actual
> `/auth/register` UI (Playwright), then promoted step-by-step via direct
> SQL (unassigned student → assigned to `'books'` in `module_admins` →
> `role='admin'`), re-testing all five `/admin/*` routes at each stage. All
> results matched the design exactly. The test account, its `module_admins`
> row, and its `profiles`/`auth.users` rows were fully deleted afterward;
> one small test image was left behind in the `student-id-cards` bucket
> because Supabase blocks direct SQL deletion of storage objects
> (`storage.protect_delete()`) — harmless orphaned file, not worth routing
> around the safety rail for.

---

## Sprint 3 — Shared `ContentCard` shell (visual refactor only)

**Depends on:** nothing schema-wise, but sequenced here to keep review size
small and isolate visual risk from data risk.

**Goal:** Books/Services/Jobs public pages visually match the room-card
design language. Zero schema/data change — still reading the static array.

- [x] Create `src/components/cards/ContentCard.tsx` — generalizes the shell
      `RoomCard.tsx`/`RoommateCard.tsx` already converged on (rounded-2xl
      card, image carousel with dot indicators + icon-badge fallback, pill
      row, price/status row, slot-based footer).
- [x] Create `BookCard`, `ServiceCard`, `JobCard` in
      `src/features/discovery/components/` as thin wrappers over
      `ContentCard`, fed by the same `LocalizedDiscoveryItem` shape as
      today (no data-shape change yet).
- [x] Update `StaticDiscoveryBrowser.tsx` to render the per-kind card
      instead of the old `DiscoveryCard`.
- [x] Delete `src/features/discovery/components/DiscoveryCard.tsx` and grep
      for any other importer to update.
- [x] Verify: `git diff -- src/features/rooms/components/RoomCard.tsx
      src/features/roommates/components/RoommateCard.tsx` is empty.
- [x] Verify: `/books`, `/services`, `/jobs` render the new card shell in
      light and dark mode; map view toggle still works on all three.
- [x] Verify: `/listings` and `/roommates` are unchanged.
- [x] `npm run build` + `npm run lint` clean.
- [x] Commit.

> **Verification note:** confirmed via Playwright screenshots (light + dark)
> on all three pages, plus `/books?view=map` and regression shots of
> `/listings` and `/roommates` — no console/page errors on any route.
> `badges` on `ContentCard` renders both "Featured" and "Sample" together
> (the original `DiscoveryCard` showed both simultaneously, not just one),
> which is why the prop is a list rather than a single badge.

---

## Sprint 4 — Books: real data, uploads, posting flow, admin panel

**Depends on:** Sprints 1–3.

**Goal:** `/books` reads real `listings` rows; a verified student can post a
book with photos; it's instant-live (no pending gate, per the locked
decision); the Books module admin can edit/archive/delete via `/admin/books`.

- [x] Migration: add `listing_book_details.semester text` (only new field
      vs. docs §8.1 not already in the existing table); create the
      `content-images` storage bucket + `storage.objects` RLS policies
      (owner-or-module-admin write, public read) as a proper migration —
      confirm the deployment pipeline actually applies
      `insert into storage.buckets` the same way it applies table DDL
      before relying on it; fall back to documented manual dashboard steps
      if not.
- [x] Migration (same file or a second one in this sprint): add a
      `"listings admin: module admin full access"` policy on `listings`
      (`for all using/with check (public.is_module_admin(listing_type || 's'))`),
      **and** extend `listing_book_details`'s existing write policy (or add
      a sibling permissive policy) so a Books module admin can also write
      book details, not just the parent `listings` row.
- [x] Create `src/lib/uploadContentImages.ts` — generalizes `post-room`'s
      `compressImage` → upload → `getPublicUrl` pattern; path
      `${module}/${rowId}/${uuid}.webp` in bucket `content-images`.
- [x] Create `src/features/books/types.ts` +
      `lib/mapListingToBookCard.ts`.
- [x] Update `src/app/books/page.tsx` to fetch active `book` listings from
      Supabase.
- [x] Rename `src/app/books/[slug]/page.tsx` → `src/app/books/[id]/page.tsx`,
      fetch by id, drop `generateStaticParams`.
- [x] Create `src/app/post-book/page.tsx` — posting form (title, author,
      course code, department, semester, condition, price, negotiable,
      images), inserts as `status='active'`.
- [x] Fill in `src/app/admin/[module]/page.tsx`'s books branch (or a
      dedicated `src/app/admin/books/page.tsx` if routing needs a distinct
      layout) — list/edit/archive/delete for the Books module admin.
- [x] Verify: post a book with 2 photos; row lands in `listings`
      (`listing_type='book'`), images in `content-images/books/<id>/...`,
      immediately visible on `/books`.
- [x] Verify: a non-owner, non-admin user cannot see an `archived` book;
      the owner and the Books module admin can.
- [x] Verify: the Books module admin can edit and hard-delete another
      student's book listing via `/admin/books`.
- [x] Verify: the Jobs/Services/Transport module admin (a different
      assignment) is denied both UI access to `/admin/books` and a direct
      RLS write attempt.
- [x] `npm run build` + `npm run lint` clean.
- [x] Commit.

> **Implementation notes:**
> - Also added `/post-book` to `src/proxy.ts`'s `PROTECTED_ROUTES`/matcher
>   (it wasn't covered before and would otherwise have let anyone load the
>   posting form pre-login).
> - `/books/page.tsx` and `/books/[id]` no longer go through
>   `DiscoveryCatalogPage`/`StaticDiscoveryBrowser` (those stay static-data
>   only, for Services/Jobs) — Books now has its own minimal
>   `BooksBrowser` (search-only, no category/area filters or map view,
>   since real listings don't carry the static sample data's synthetic
>   category/area taxonomy). Posting requires `verification_status =
>   'approved'`, matching the same trust gate `post-room` uses.
> - Built one shared `BookForm` component reused by both `/post-book`
>   (create) and the admin panel's inline edit, instead of duplicating a
>   near-identical form twice.
> - **Bug found and fixed during verification:** the book detail page's
>   anon-client query originally requested `profiles(full_name, email)`,
>   but `public.profiles` only grants the `anon` Postgres role column-level
>   `SELECT` on `full_name`/`phone`/`avatar_url`/`is_verified`/etc — not
>   `email` (only `authenticated` has that). Requesting an ungranted column
>   inside a PostgREST embed fails the *entire* embedded select with
>   `42501 permission denied`, which silently became a 404 via `notFound()`
>   rather than a visible error. Fixed by dropping `email` from the
>   anon-client query (the admin panel's authenticated-client query still
>   requests it, since `authenticated` has the grant). Worth remembering
>   for Sprints 5-7: any anon-client query embedding `profiles` must stick
>   to the anon-granted column set.
> - Verified live end-to-end (Playwright + a disposable verified test
>   account, cleaned up afterward): posted a real book with 2 photos
>   through the actual UI, confirmed DB state, confirmed archived-book
>   hiding from anon visitors, confirmed a Books module admin (different
>   account) could edit/archive/delete another student's listing through
>   `/admin/books`, and confirmed both a UI-level and a direct-RLS-level
>   denial for a differently-scoped (`'jobs'`) module admin.

---

## Sprint 5 — Jobs: posting flow, approval gate, admin panel

**Depends on:** Sprint 4 (reuses `content-images` bucket, `uploadContentImages`,
`/admin/[module]` pattern).

**Goal:** `/jobs` reads real `listings` rows; per §11.1, new jobs require
Jobs-module-admin approval before going public.

- [x] Migration: widen `listings.status` check constraint to include
      `'pending'` (confirm the actual constraint name via `\d listings`
      before writing the `drop constraint` — don't assume the default
      name). Add the same module-admin `for all` policy pattern as Sprint 4
      to `listing_job_details`.
- [x] Create `src/features/jobs/types.ts` + `lib/mapListingToJobCard.ts`.
- [x] Update `src/app/jobs/page.tsx` to fetch active `job` listings only.
- [x] Rename `src/app/jobs/[slug]/page.tsx` → `src/app/jobs/[id]/page.tsx`.
- [x] Create `src/app/post-job/page.tsx` — inserts as `status='pending'`.
- [x] Fill in the Jobs branch of the admin panel — pending-queue
      approve (→`active`) / reject (→`archived`) / edit / delete.
- [x] Verify: a posted job does not appear on public `/jobs` while
      `pending`.
- [x] Verify: the Jobs module admin sees it in the queue, approves it, it
      now appears on `/jobs`.
- [x] Verify: the Books module admin (not Jobs) cannot access the Jobs
      queue or approve via direct RLS write.
- [x] Regression: re-run Sprint 4's Books checks — the shared `pending`
      status addition doesn't change Books' instant-live behavior.
- [x] `npm run build` + `npm run lint` clean.
- [x] Commit.

> **Implementation notes:**
> - Confirmed exact constraint name (`listings_status_check`) and the full
>   `listing_job_details` column set directly against the live DB before
>   writing the migration, rather than assuming Postgres's default naming.
>   The existing `"listings admin: module admin full access"` policy from
>   Sprint 4 is generic (`is_module_admin(listing_type || 's')`), so it
>   already covered `job` rows — only the `listing_job_details` sibling
>   policy needed adding.
> - The base "owner, admin, or active" SELECT policy on `listings` (from
>   the foundation migration) already hid a `pending` row from everyone but
>   its owner and an admin, with zero changes — the module-admin bypass
>   policy from Sprint 4 gave the Jobs module admin visibility into other
>   users' pending rows for free.
> - `/jobs/[id]/page.tsx`'s anon query adds an explicit
>   `.eq('status', 'active')` (Books' equivalent query doesn't have this,
>   since Books never has a `pending` row) — without it, a pending job's
>   direct detail URL would still resolve to a real page instead of 404ing.
> - `/post-job`'s success redirect goes to `/jobs` (the browse page), not
>   `/jobs/<id>` like Books' post-flow — the new listing is `pending`, so
>   its own anon-client detail-page fetch would 404 immediately after
>   posting.
> - Reused `uploadContentImages('jobs', ...)` and the `content-images`
>   bucket/policies unchanged — both were already generic across modules.
> - Also added `/post-job` to `src/proxy.ts`'s `PROTECTED_ROUTES`/matcher,
>   same gap Sprint 4 found and fixed for `/post-book`.
> - **Unrelated pre-existing build blocker found and fixed:** `next build`
>   type-checks the whole repo, and
>   `src/app/api/ai/extract-room-listing/route.ts:40` failed
>   (`string | undefined` not narrowed after a `.filter(Boolean)`-derived
>   `missing` array) — untouched by this sprint (`git log` shows its last
>   commit was `23a7f69`, the AI room-posting feature). Fixed with a direct
>   `if (!supabaseUrl || !serviceRoleKey || !anthropicKey)` guard so
>   TypeScript narrows correctly; behavior (the 503 response body) is
>   unchanged.
> - Verified live end-to-end (Playwright + three disposable test accounts —
>   a verified poster, a Jobs module admin, a Books module admin — all
>   cleaned up afterward): posted a real job with a photo through the
>   actual UI, confirmed it landed `pending` and was invisible on public
>   `/jobs` and 404'd at its own detail URL, confirmed the Jobs module
>   admin saw it in the pending queue and approving it flipped it to
>   `active` and made it publicly visible, confirmed the Books module admin
>   was denied both UI access to `/admin/jobs` (redirected to `/dashboard`)
>   and a direct RLS write attempt (0 rows affected), and re-ran the Books
>   posting flow to confirm it's still instant-live (`status='active'`
>   immediately) after widening the shared `status` constraint.

---

## Sprint 6 — Local Services: `service_places`, admin-only CRUD

**Depends on:** Sprints 1–3 (module-admin plumbing, `ContentCard`);
independent of Sprints 4–5 except for reusing the `content-images` bucket.

**Goal:** `/services` reads real, module-admin-curated `service_places`
rows. No student-facing posting flow (moderator/admin-curated directory
per §9.1).

- [ ] Migration: `service_places` table (category, name, description,
      locality_id, lat/lng, phone, hours, price_notes, images, status,
      created_by) + RLS (`public.is_module_admin('services')` for all
      write; public read when active).
- [ ] Create `src/features/services/types.ts` +
      `lib/mapServicePlaceToCard.ts`.
- [ ] Update `src/app/services/page.tsx` to fetch active `service_places`.
- [ ] Rename `src/app/services/[slug]/page.tsx` →
      `src/app/services/[id]/page.tsx`.
- [ ] Fill in the Services branch of the admin panel — full CRUD including
      image upload via `uploadContentImages('services', ...)`.
- [ ] Verify: Services module admin creates a place with photos; it's
      immediately public on `/services`.
- [ ] Verify: no route or RLS path lets a plain student create/edit a
      service place.
- [ ] Verify: another module's admin cannot access `/admin/services`.
- [ ] Verify: map view on `/services` still renders pins.
- [ ] `npm run build` + `npm run lint` clean.
- [ ] Commit.

---

## Sprint 7 — Transport: `bus_routes`, admin-only CRUD, retire `ModulePreview`

**Depends on:** Sprints 1–3, 6 (same admin-CRUD-directory pattern as
Services).

**Goal:** `/transport` stops rendering the static `ModulePreview` hero and
shows real, card-based bus routes.

- [ ] Migration: `bus_routes` table (name, stops jsonb, universities_served
      uuid[], fare_notes, images, status, created_by) + RLS scoped to
      `public.is_module_admin('transport')`.
- [ ] Create `src/features/transport/types.ts` +
      `src/features/transport/components/TransportCard.tsx` (built on
      `ContentCard`; routes may have zero photos, so the fallback icon is
      often the primary visual).
- [ ] Update `src/app/transport/page.tsx` — remove the `ModulePreview`
      render, replace with a route list/grid.
- [ ] Create `src/app/transport/[id]/page.tsx` — route detail (stops,
      universities served, fare notes).
- [ ] Fill in the Transport branch of the admin panel — CRUD for routes.
- [ ] Verify: Transport module admin creates a route with 3 stops; appears
      on `/transport` immediately.
- [ ] Verify: no write path into `bus_routes` for anyone else.
- [ ] Verify: `/transport` no longer shows the "Months 7–12" preview copy.
- [ ] Regression: confirm `/transport/carpools` (or its intentional
      removal) is handled deliberately, not silently broken.
- [ ] `npm run build` + `npm run lint` clean.
- [ ] Commit.

---

## Sprint 8 — Cleanup + activation review

**Depends on:** Sprints 1–7 all verified.

- [ ] Remove now-dead `BOOKS`/`SERVICES`/`JOBS` arrays and dead branches
      from `src/features/discovery/data/index.ts` (grep first — keep the
      file only if something else still imports from it).
- [ ] Re-evaluate `state` for `books`/`services`/`jobs`/`transport` in
      `src/config/modules.ts` against `docs/roadmap-activation.md`'s
      promotion gates (bn/en copy and rate-limiting are explicitly out of
      this roadmap's scope — note that rather than silently flipping
      `state`).
- [ ] Update `docs/roadmap-activation.md`'s activation-order section.
- [ ] Add module-admin nav entries to `Navbar.tsx` for users whose
      `moduleAdmin` capability includes them.
- [ ] Full regression pass: Rooms, Roommates, Books, Jobs, Services,
      Transport, all four admin panels, as anonymous/student/each module
      admin/global admin.
- [ ] Confirm `git log` shows one migration per sprint, none editing a
      pre-existing migration.
- [ ] `npm run build` + `npm run lint` clean.
- [ ] Commit.
