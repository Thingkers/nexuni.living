-- Bug: confirming or cancelling a booking on a multi-seat room (mess/
-- bachelor/sublet) was decrementing/restoring far more seats than the
-- booking actually held -- e.g. booking 1 of 2 seats immediately marked the
-- whole room as fully booked.
--
-- Root cause: 20260703100000_atomic_booking_actions.sql added
-- set_booking_status(), a SECURITY DEFINER RPC that atomically moves a
-- booking's status AND adjusts rooms.available_seats by the booking's own
-- `seats` count, inside one locked transaction (replacing an unsafe
-- client-side read-modify-write). That migration never disabled the two
-- older AFTER UPDATE triggers on `bookings` that were doing the same job
-- with the OLD (buggy) logic -- hardcoded to always adjust by exactly 1
-- seat, ignoring bookings.seats entirely:
--   - booking_status_change_trigger -> handle_booking_status_change()
--   - booking_restore_seats_trigger -> restore_seats_after_cancel()
--
-- Because set_booking_status() itself performs `update bookings set
-- status = ...`, that UPDATE fires these still-enabled triggers, which
-- then apply a SECOND, hardcoded -1/+1 seat adjustment on top of the RPC's
-- own correct one. A 2-seat room booked for 1 seat: the RPC correctly sets
-- available_seats 2 -> 1, then the stale trigger immediately does another
-- -1 -> 0, flipping the room to 'booked' even though one seat was never
-- taken.
--
-- Fix: drop both stale triggers (and the functions they solely existed
-- for -- confirmed via information_schema.triggers that nothing else
-- references them) so set_booking_status() is the only path that ever
-- touches rooms.available_seats/status for a booking. The booking_event_*
-- triggers (audit log, no seat math) and guard_bookings_status (permission
-- check, which set_booking_status()'s own header comment relies on still
-- firing) are untouched.

drop trigger if exists booking_status_change_trigger on public.bookings;
drop trigger if exists booking_restore_seats_trigger on public.bookings;

drop function if exists public.handle_booking_status_change();
drop function if exists public.restore_seats_after_cancel();
