-- Finding: two policies let ANY authenticated user insert a `reports` row
-- with a `reporter_id` that isn't their own (`auth.uid() IS NOT NULL` /
-- `auth.role() = 'authenticated'` don't check reporter_id at all), so a
-- report could be spoofed as coming from someone else. A correctly scoped
-- policy ("Users can create own reports", auth.uid() = reporter_id)
-- already exists and covers the app's real usage — the broader ones are
-- redundant and only widen access, so they're dropped outright.

drop policy if exists "authenticated user can report" on public.reports;
drop policy if exists "authenticated can submit reports" on public.reports;


-- Finding: "Allow insert booking events" lets any authenticated user
-- attach an event to ANY booking_id, not just bookings they're the tenant
-- or room owner of — so a user could inject fake timeline entries into a
-- stranger's booking. Replaced with a check that mirrors the existing
-- (correct) SELECT policy's participant logic.

drop policy if exists "Allow insert booking events" on public.booking_events;

-- Important: remove previous attempt if it already exists
drop policy if exists "booking participants can insert events" on public.booking_events;


create policy "booking participants can insert events"
on public.booking_events
for insert
with check (
  exists (
    select 1
    from bookings
    where bookings.id = booking_events.booking_id
      and (
        bookings.user_id = auth.uid()
        or exists (
          select 1
          from rooms
          where rooms.id = bookings.room_id
            and rooms.owner_id = auth.uid()
        )
      )
  )
);
