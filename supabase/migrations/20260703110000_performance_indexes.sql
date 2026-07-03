-- Indexes for the hot query paths. Fine without them at launch size, but
-- listings search, inbox unread counts, and the booking dashboards all turn
-- into sequential scans as the tables grow.

-- Trigram matching for the ilike('%term%') searches on listings/suggestions
-- (a leading-wildcard LIKE can't use a normal btree index).
create extension if not exists pg_trgm;

-- rooms: listings feed always filters out booked/closed and orders by
-- created_at / rent, with optional equality filters.
create index if not exists rooms_visible_created_at_idx
  on public.rooms (created_at desc)
  where status not in ('booked', 'closed');

create index if not exists rooms_visible_rent_idx
  on public.rooms (rent)
  where status not in ('booked', 'closed');

create index if not exists rooms_gender_type_idx on public.rooms (gender_type);
create index if not exists rooms_type_idx        on public.rooms (type);
create index if not exists rooms_owner_id_idx    on public.rooms (owner_id);

create index if not exists rooms_location_name_trgm_idx
  on public.rooms using gin (location_name gin_trgm_ops);

create index if not exists rooms_title_trgm_idx
  on public.rooms using gin (title gin_trgm_ops);

-- messages: navbar/inbox unread badge counts + conversation history.
create index if not exists messages_receiver_unread_idx
  on public.messages (receiver_id, is_read);

create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_receiver_created_idx
  on public.messages (receiver_id, created_at desc);

-- bookings: owner dashboard (pending per room), tenant dashboard, and the
-- expiry cron's "confirmed and past expires_at" scan.
create index if not exists bookings_room_status_idx
  on public.bookings (room_id, status);

create index if not exists bookings_user_status_idx
  on public.bookings (user_id, status);

create index if not exists bookings_confirmed_expiry_idx
  on public.bookings (expires_at)
  where status = 'confirmed';

-- saved_rooms: SavedRoomsProvider loads all ids for the current user.
create index if not exists saved_rooms_user_id_idx
  on public.saved_rooms (user_id);
