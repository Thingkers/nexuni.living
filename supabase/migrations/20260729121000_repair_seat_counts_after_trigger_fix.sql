-- Data repair following 20260729120000_drop_legacy_booking_seat_triggers.sql.
-- The stale triggers double-decremented rooms.available_seats for real
-- bookings before they were dropped; this backfills every shared-seat room
-- (mess/bachelor/sublet) so available_seats/status match what the booking
-- history actually supports, rather than assuming only the one room found
-- during investigation is affected.

with correct_counts as (
  select
    r.id,
    r.total_seats - coalesce(sum(b.seats) filter (where b.status in ('confirmed', 'active')), 0) as correct_available
  from public.rooms r
  left join public.bookings b on b.room_id = r.id
  where r.type in ('mess', 'bachelor', 'sublet')
  group by r.id, r.total_seats
)
update public.rooms r
set
  available_seats = cc.correct_available,
  status = case
    when cc.correct_available <= 0 then 'booked'
    when cc.correct_available < r.total_seats then 'partial'
    else 'open'
  end
from correct_counts cc
where r.id = cc.id
  and r.available_seats <> cc.correct_available;
