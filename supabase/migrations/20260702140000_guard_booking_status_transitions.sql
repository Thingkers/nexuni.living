-- Finding: the "bookings" UPDATE policies (e.g. "tenant or owner can update
-- booking") let the tenant update the SAME row they're allowed to read —
-- but RLS is row-level only, so nothing stops the tenant from setting
-- `status` to 'confirmed' / 'active' / 'rejected' directly from the browser
-- console, self-approving their own booking and completely skipping the
-- room owner's review step (src/app/dashboard/bookings/page.tsx is meant
-- to be the only place that sets those statuses).
--
-- This trigger enforces who is allowed to move a booking into which
-- status, independent of whichever RLS policy matched the row:
--   - service_role (cron, admin routes)      -> any transition
--   - room owner / admin                     -> any transition
--   - tenant (bookings.user_id = auth.uid()) -> only pending/confirmed -> cancelled
--     (mirrors the only tenant-initiated status change in the app:
--      src/app/dashboard/my-bookings/page.tsx's cancelBooking)
create or replace function public.guard_booking_status_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  is_admin boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.status is distinct from old.status then
    is_owner := exists (
      select 1 from rooms where rooms.id = old.room_id and rooms.owner_id = auth.uid()
    );
    is_admin := exists (
      select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    );

    if is_owner or is_admin then
      return new;
    end if;

    if auth.uid() = old.user_id
       and new.status = 'cancelled'
       and old.status in ('pending', 'confirmed') then
      return new;
    end if;

    raise exception 'not allowed to change booking status from % to % this way', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_bookings_status on public.bookings;

create trigger guard_bookings_status
before update on public.bookings
for each row
execute function public.guard_booking_status_transitions();
