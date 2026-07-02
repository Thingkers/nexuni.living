-- Finding: "public can view active rooms" tries to hide closed listings
-- from everyone except their owner (status <> 'closed' OR auth.uid() =
-- owner_id) — but two other permissive SELECT policies on the same table
-- ("public can view rooms", "rooms_public_read") grant unconditional
-- (qual: true) read access. Postgres OR-combines permissive policies, so
-- those two unconditional ones neutralize the closed-room restriction:
-- anyone querying the REST API directly (bypassing the app's own
-- `.neq('status', 'closed')` filter) can still read closed/booked rooms,
-- including the owner's contact info joined into that query.
drop policy if exists "public can view rooms" on public.rooms;
drop policy if exists "rooms_public_read" on public.rooms;
-- "public can view active rooms" remains and is now the only SELECT
-- policy, so it actually applies.
