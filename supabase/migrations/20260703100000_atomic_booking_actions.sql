-- Finding: confirming/ending a booking updated `rooms.available_seats` from
-- the browser with a read-modify-write (src/app/dashboard/bookings/page.tsx
-- read the count, subtracted in JS, wrote it back). Two near-simultaneous
-- confirmations both read the same stale count, so a 3-seat room could end
-- up with 4 confirmed bookings (overselling). Cancelling/completing a
-- confirmed booking also never restored the held seats.
--
-- set_booking_status() moves the booking AND adjusts the room's seats in one
-- transaction, with the rows locked (FOR UPDATE) so concurrent calls
-- serialize instead of racing. SECURITY DEFINER so the room-side seat
-- adjustment also works when the *tenant* legitimately cancels (tenants have
-- no RLS right to update rooms). Permission for the status change itself is
-- still enforced by the guard_bookings_status trigger, which fires on the
-- UPDATE inside this function and sees the real caller's auth.uid() — if the
-- caller isn't allowed to make the transition, the whole function (including
-- any seat change) rolls back.

create or replace function public.set_booking_status(p_booking_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  r record;
  v_seats integer;
  v_new_available integer;
begin
  if p_status not in ('confirmed', 'rejected', 'cancelled', 'active', 'completed') then
    raise exception 'invalid target status: %', p_status;
  end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  select * into r from rooms where id = b.room_id for update;
  if not found then
    raise exception 'room not found';
  end if;

  v_seats := coalesce(b.seats, 1);

  if p_status = 'confirmed' then
    if b.status <> 'pending' then
      raise exception 'only pending bookings can be confirmed (current: %)', b.status;
    end if;

    if r.type in ('mess', 'bachelor', 'sublet') then
      if coalesce(r.available_seats, 0) < v_seats then
        raise exception 'NOT_ENOUGH_SEATS';
      end if;
      v_new_available := coalesce(r.available_seats, 0) - v_seats;
      update rooms
      set available_seats = v_new_available,
          status = case when v_new_available <= 0 then 'booked' else 'partial' end
      where id = r.id;
    else
      -- single / master_bedroom — one booking fills the room
      update rooms set status = 'booked' where id = r.id;
    end if;

    -- The 24h hold starts when the owner confirms, not when the request was
    -- created (BookingModal used to stamp expires_at at insert time, so a
    -- request confirmed 20h later only got a 4h hold).
    update bookings
    set status = 'confirmed', expires_at = now() + interval '24 hours'
    where id = p_booking_id;
    return;
  end if;

  -- Releasing transitions: seats were only taken at confirmation, so only
  -- give them back when leaving confirmed/active.
  if b.status in ('confirmed', 'active') and p_status in ('cancelled', 'rejected', 'completed') then
    if r.type in ('mess', 'bachelor', 'sublet') then
      v_new_available := least(r.total_seats, coalesce(r.available_seats, 0) + v_seats);
      update rooms
      set available_seats = v_new_available,
          status = case when v_new_available > 0 then 'open' else 'booked' end
      where id = r.id;
    else
      update rooms set status = 'open' where id = r.id;
    end if;
  end if;

  update bookings set status = p_status where id = p_booking_id;
end;
$$;

revoke all on function public.set_booking_status(uuid, text) from public;
revoke all on function public.set_booking_status(uuid, text) from anon;
grant execute on function public.set_booking_status(uuid, text) to authenticated;
grant execute on function public.set_booking_status(uuid, text) to service_role;

-- Finding: BookingModal checks "do I already have a pending request?" and
-- then inserts — a classic check-then-insert race. Two quick clicks (or two
-- tabs) both pass the check and both insert. Enforce it in the database.
--
-- Cancel any existing duplicates first (keep the newest per room+user) so
-- the unique index can build. The status-guard trigger would reject these
-- UPDATEs (no auth context during a migration), so it is disabled around
-- the cleanup.
alter table public.bookings disable trigger guard_bookings_status;

update public.bookings b
set status = 'cancelled'
where b.status = 'pending'
  and exists (
    select 1
    from public.bookings newer
    where newer.room_id = b.room_id
      and newer.user_id = b.user_id
      and newer.status = 'pending'
      and newer.created_at > b.created_at
  );

alter table public.bookings enable trigger guard_bookings_status;

create unique index if not exists bookings_one_pending_per_user_room
on public.bookings (room_id, user_id)
where status = 'pending';
