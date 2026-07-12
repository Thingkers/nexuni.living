-- Problem: profiles.university and rooms.location_name/latitude/longitude
-- are free text/floats with nothing linking them to the structured
-- universities/localities tables added in
-- 20260711120000_create_universities_and_localities.sql.
--
-- Fix: add nullable FK columns to profiles/rooms (old free-text columns are
-- untouched, so existing data and reads keep working) and best-effort
-- backfill profiles.university_id from the existing free-text value.
--
-- rooms.nearest_university_ids is a uuid[], not a distance-carrying join
-- table: rooms and universities both already have lat/lng, so the actual
-- "X km / Y min from campus" badge can be computed live client-side with the
-- existing Haversine helper (src/features/map/components/RoomMap.tsx,
-- getDistanceKm) instead of persisting a distance that would need
-- recalculating whenever either row's coordinates change. Postgres can't put
-- a foreign key on individual array elements, so referential integrity here
-- is the responsibility of whatever backfill/admin code populates this
-- column, not the database.

alter table public.rooms
  add column if not exists locality_id uuid references public.localities(id) on delete set null,
  add column if not exists nearest_university_ids uuid[] not null default '{}';

create index if not exists rooms_locality_id_idx
  on public.rooms (locality_id);

create index if not exists rooms_nearest_university_ids_idx
  on public.rooms using gin (nearest_university_ids);

alter table public.profiles
  add column if not exists university_id uuid references public.universities(id) on delete set null;

create index if not exists profiles_university_id_idx
  on public.profiles (university_id);

-- Best-effort, idempotent: only touches rows that don't have a
-- university_id yet, so re-running this migration (or a future manual
-- re-run) is a safe no-op. Matches case-insensitively against name, name_bn,
-- or any aliases entry; `order by name limit 1` makes the match
-- deterministic if a free-text value somehow matched more than one
-- university. Rows with no match are left NULL rather than guessed at.
update public.profiles p
set university_id = (
  select u.id
  from public.universities u
  where u.is_active
    and (
      lower(u.name) = lower(trim(p.university))
      or (u.name_bn is not null and lower(u.name_bn) = lower(trim(p.university)))
      or exists (
        select 1
        from jsonb_array_elements_text(u.aliases) as a(value)
        where lower(a.value) = lower(trim(p.university))
      )
    )
  order by u.name
  limit 1
)
where p.university_id is null
  and p.university is not null
  and trim(p.university) <> '';

-- profiles has anon/authenticated SELECT locked down to an explicit column
-- allowlist (20260702170000_restrict_anon_profile_columns.sql,
-- 20260702180000_lock_down_authenticated_sensitive_columns.sql) — a new
-- column is invisible to both roles until added here. No equivalent grant is
-- needed for UPDATE (neither of those migrations touched UPDATE grants) or
-- for rooms (that table has no column-level grant restriction, so its new
-- columns inherit the table's existing blanket grant automatically).
grant select (university_id) on public.profiles to anon, authenticated;

-- Before shipping: confirm the existing "update own profile" policy is
-- row-scoped only (auth.uid() = id, no column restriction) so users can set
-- their own university_id, e.g.:
--   select policyname, cmd, qual, with_check from pg_policies
--   where tablename = 'profiles';
-- university_id is not in guard_profiles_privileged_fields's guarded-column
-- list (role, is_verified, verification_status only), so it shouldn't be
-- blocked by that trigger either.
