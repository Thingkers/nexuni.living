# `listings` — foundation for Books & Jobs

## Why this exists

`docs/feature-breakdown.md` §12 originally proposed generalizing the
existing `rooms` table into a polymorphic `listings` model (`rooms` →
`listings` + `listing_housing_details`) so every future vertical shares one
schema. Investigating the live `rooms`/`bookings` system before starting
that refactor found it materially riskier than the doc assumed:

- `public.set_booking_status()` (see
  `supabase/migrations/20260703100000_atomic_booking_actions.sql`) — the
  SECURITY DEFINER RPC that fixed a real overselling bug — takes
  `SELECT ... FOR UPDATE` locks directly on `rooms` and writes
  `available_seats`/`status` in place, inside one transaction with the
  `bookings` row. This kind of row-locking does not translate safely onto a
  join view (`listings` ⋈ `listing_housing_details`); every seat-locking
  function would need rewriting and re-verifying against the exact race
  condition the migration's own header comment describes fixing.
- Two more triggers (`update_rooms_search_vector`,
  `set_room_nearest_universities`) and 23 application files query `rooms`
  directly.

**Decision:** `rooms`, `bookings`, `booking_events`, and every trigger/RPC
touching them stay completely untouched. Housing keeps using `rooms`. A
`listings` table was added instead, scoped only to the verticals that are
actually listing-shaped and don't yet have a table: **Books** and **Jobs**.

## What is — and isn't — a `listings` row

Re-reading `docs/feature-breakdown.md`, not every "Student Life" module is
shaped like a listing:

| Module | Shape | Where it lives |
|---|---|---|
| Books (§8) | user posts an item for sale | `listings` (`listing_type='book'`) + `listing_book_details` |
| Jobs (§11.1) | user/employer posts an opening | `listings` (`listing_type='job'`) + `listing_job_details` |
| Local Services (§9) | moderator-curated directory of places | own future `service_places` table — not a listing |
| Transport (§11.2) | bus routes (data) + a roommate-board-shaped carpool board | own future tables — not a listing |
| Payments (§11.3) | a ledger | own future `payments`/`escrow_holds` tables — not a listing |

Housing itself stays on `rooms`, not `listings` — see the decision above.

## Schema

`supabase/migrations/20260724120000_create_listings_foundation.sql`:

- **`listings`** — common fields modeled on `rooms`'s existing columns:
  `id`, `listing_type` (`'book' | 'job'`), `owner_id`, `title`,
  `description`, `price` (integer taka, nullable — jobs may be a salary
  range instead), `status` (`'active' | 'archived'`), `locality_id`,
  `university_id`, `images`, timestamps.
- **`listing_book_details`** — 1:1 with a `book` listing: `author`,
  `course_code`, `department`, `condition`, `negotiable`.
- **`listing_job_details`** — 1:1 with a `job` listing: `employer`,
  `job_type`, `salary_min/max`, `apply_method`, `apply_value`.

RLS on all three tables follows the same owner/admin/public-if-active
pattern already used by `rooms`, as one combined `SELECT` policy per table
(not stacked permissive policies — see
`20260702160000_remove_redundant_rooms_visibility_policies.sql` for why
`rooms` had to be fixed after getting that wrong). Detail tables proxy
visibility through their parent `listings` row, the same join-through-parent
pattern `bookings`' RLS already uses against `rooms.owner_id`.

Indexes: `listings(listing_type, created_at desc) where status = 'active'`
(mirrors `roommate_profiles_active_created_at_idx`), plus indexes on
`owner_id`, `locality_id`, `university_id`.

## What's deliberately not done here

No application code reads or writes these tables yet — no UI, no
`src/config/modules.ts` wiring, no Navbar/Dashboard badge changes. That's
Sprint 9 (Books) and Sprint 11 (Jobs) in `docs/playbook.md`, each its own
planned session.
