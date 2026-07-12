-- Problem: rooms.nearest_university_ids (added in
-- 20260711130000_add_university_locality_refs_to_profiles_and_rooms.sql) has
-- never been populated -- every room's array is still '{}', since nothing
-- computes it. No PostGIS/earthdistance/cube extension is enabled in this
-- project (only pg_trgm, confirmed across every migration in this repo), so
-- distance has to be computed with a plain Haversine formula rather than a
-- spatial extension's operators.
--
-- Fix: a reusable haversine_km() SQL function (same formula as the
-- client-side getDistanceKm in src/features/map/components/RoomMap.tsx),
-- plus a trigger that recomputes a room's 3 nearest active universities
-- whenever its coordinates are set/changed, and a one-time backfill for
-- rooms that already had coordinates before this trigger existed.
--
-- greatest(0, ...) guards a real Postgres-specific footgun: floating-point
-- rounding on two very close (or identical) coordinates can push the value
-- under sqrt() slightly negative. JS's Math.sqrt silently returns NaN for
-- that (which is why the client-side version never needed this guard), but
-- Postgres's sqrt(float8) raises a hard error -- enough to abort the whole
-- insert/update -- so it's clamped to zero first.
create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(sqrt(greatest(0,
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  )));
$$;

-- security definer here is for RLS-independence/future-proofing (consistency
-- with this repo's other triggers, and protection if universities' public
-- read policy is ever tightened) -- not to close an existing privilege gap.
-- universities' own RLS ("public can view active universities", using
-- (is_active)) already lets every caller read exactly the same is_active
-- rows this function reads.
create or replace function public.set_room_nearest_universities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.nearest_university_ids := '{}';
    return new;
  end if;

  select coalesce(
    array_agg(u.id order by public.haversine_km(new.latitude, new.longitude, u.lat, u.lng) asc),
    '{}'
  )
  into new.nearest_university_ids
  from (
    select u.id, u.lat, u.lng
    from public.universities u
    where u.is_active and u.lat is not null and u.lng is not null
    order by public.haversine_km(new.latitude, new.longitude, u.lat, u.lng) asc
    limit 3
  ) u;

  return new;
end;
$$;

drop trigger if exists set_room_nearest_universities on public.rooms;

-- Fires on every insert (rooms are created with no coordinates today --
-- post-room/page.tsx never sets latitude/longitude -- so this just resets to
-- '{}' at creation time) and whenever latitude/longitude are written on
-- update. Note: the edit page's save handler always includes both columns in
-- its update() payload regardless of whether the map picker was touched, so
-- in practice this fires on every edit-page save, not only on real
-- coordinate changes -- harmless (recomputing the same 3 ids is cheap), just
-- worth knowing the `of` clause isn't buying the savings its name implies
-- given how this app currently issues its updates.
create trigger set_room_nearest_universities
before insert or update of latitude, longitude on public.rooms
for each row
execute function public.set_room_nearest_universities();

-- One-time backfill for rooms that already had coordinates set (via the
-- edit page's map picker) before this trigger existed. Idempotent: rerunning
-- recomputes the same deterministic result from the same data.
update public.rooms r
set nearest_university_ids = coalesce((
  select array_agg(u.id order by public.haversine_km(r.latitude, r.longitude, u.lat, u.lng) asc)
  from (
    select u.id, u.lat, u.lng
    from public.universities u
    where u.is_active and u.lat is not null and u.lng is not null
    order by public.haversine_km(r.latitude, r.longitude, u.lat, u.lng) asc
    limit 3
  ) u
), '{}')
where r.latitude is not null and r.longitude is not null;
