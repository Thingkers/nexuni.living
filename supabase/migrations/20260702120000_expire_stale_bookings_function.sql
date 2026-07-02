-- Expires confirmed bookings whose 24h hold has passed and reopens the
-- room, all inside one transaction (a Postgres function body is atomic).
--
-- Replaces the old per-booking loop in the cron route, which:
--   1) made a DB round trip per expired booking (slow, could time out
--      the serverless function if many bookings expire at once), and
--   2) could under-restore seats when two expiring bookings shared the
--      same room, because each update read available_seats from the same
--      stale snapshot fetched at the start of the loop instead of the
--      running total.
--
-- This version aggregates seats-to-restore per room before touching
-- `rooms`, so concurrent expirations on the same room are summed
-- correctly, and either the whole batch commits or none of it does.
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
as $$
declare
  expired_count integer;
begin
  with expired as (
    update bookings
    set status = 'expired'
    where status = 'confirmed'
      and expires_at is not null
      and expires_at < now()
    returning id, room_id, coalesce(seats, 1) as seats
  ),
  seat_totals as (
    select room_id, sum(seats) as seats_to_restore
    from expired
    group by room_id
  ),
  shared_room_updates as (
    update rooms r
    set available_seats = least(r.total_seats, coalesce(r.available_seats, 0) + st.seats_to_restore),
        status = case
          when least(r.total_seats, coalesce(r.available_seats, 0) + st.seats_to_restore) > 0 then 'open'
          else 'booked'
        end
    from seat_totals st
    where r.id = st.room_id
      and r.type in ('mess', 'bachelor', 'sublet')
    returning r.id
  ),
  single_room_updates as (
    update rooms r
    set status = 'open'
    from seat_totals st
    where r.id = st.room_id
      and r.type not in ('mess', 'bachelor', 'sublet')
    returning r.id
  )
  select count(*) into expired_count from expired;

  return expired_count;
end;
$$;
