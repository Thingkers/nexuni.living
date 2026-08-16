-- P0-A · listings — the job approval gate can be bypassed by the listing's author
--
-- Problem:
--   `listings` carries an approval workflow for jobs (20260731120000) but
--   nothing enforces it. Verified live on 2026-08-07:
--
--     policy "listings insert: own row"        INSERT
--       with_check = (auth.uid() = owner_id)              -- status unconstrained
--     policy "listings update: owner or admin" UPDATE
--       qual       = (auth.uid() = owner_id OR admin)
--       with_check = NULL                                 -- inherits qual
--
--     select count(*) from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--     where c.relname = 'listings' and not t.tgisinternal;   -> 0
--
--   `listings.status` defaults to 'pending' and src/app/post-job/page.tsx sends
--   status: 'pending', but both are client-side courtesies. Two single-request
--   attacks work with an ordinary student session and the public anon key:
--
--     POST  /rest/v1/listings  { listing_type:"job", owner_id:<self>, status:"active", ... }
--     PATCH /rest/v1/listings?id=eq.<own pending job>  { "status":"active" }
--
--   Either one publishes a job to every user of the platform without a
--   moderator ever seeing it, making JobsAdminPanel and the whole approval
--   workflow decorative. Confirmed by inspecting policies and triggers only —
--   never executed against production.
--
-- Fix:
--   A BEFORE INSERT OR UPDATE trigger that, for non-moderators:
--     - forces status = 'pending' on INSERT of a job,
--     - refuses to let status become 'active' on UPDATE of a job,
--     - freezes listing_type and owner_id.
--
-- Reason:
--   This cannot be expressed as a policy. `WITH CHECK` has no access to OLD, so
--   it cannot distinguish "the owner edited the description of their pending
--   job" (allowed) from "the owner flipped it to active" (forbidden) — both
--   produce a NEW row that satisfies `auth.uid() = owner_id`. A BEFORE trigger
--   is the only place the transition itself is visible. This repository already
--   solves the identical problem the identical way for bookings
--   (guard_booking_status_transitions, 20260702140000) and for profiles
--   (prevent_self_privilege_escalation, 20260702130000); this follows that
--   precedent rather than inventing a third pattern.
--
--   RLS ordering makes the INSERT arm safe: Postgres evaluates a policy's
--   WITH CHECK *after* BEFORE triggers have rewritten the row, so forcing
--   status here cannot be undone by the policy.
--
--   BOOKS ARE DELIBERATELY UNTOUCHED. src/app/post-book/page.tsx inserts
--   status:'active' and books are instant-publish by product decision
--   (confirmed 2026-08-07); only listing_type = 'job' is gated. The
--   listings_listing_type_check constraint limits the column to 'book' | 'job',
--   so there is no third type to reason about.
--
--   NO EXISTING POLICY IS DROPPED OR ALTERED by this migration.
--
create or replace function public.guard_listing_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_moderator boolean;
begin
  -- Service-role callers are the admin API routes (src/app/api/admin/*), which
  -- do their own authorization. Same escape hatch as the sibling guards.
  if auth.role() = 'service_role' then
    return new;
  end if;

  v_is_moderator :=
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
    or public.is_module_admin(new.listing_type || 's');

  if v_is_moderator then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Silently pinned rather than raised: post-job already sends 'pending', so
    -- an honest client never notices, and a crafted one is corrected instead of
    -- being handed a message that tells it what to try next.
    if new.listing_type = 'job' and new.status is distinct from 'pending' then
      new.status := 'pending';
    end if;
    return new;
  end if;

  -- UPDATE ------------------------------------------------------------------

  -- Without this a book could be inserted as active and then relabelled a job,
  -- arriving at exactly the state the INSERT arm refuses to create.
  if new.listing_type is distinct from old.listing_type then
    raise exception 'listing_type cannot be changed after creation';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed after creation';
  end if;

  -- Withdrawing is still the owner's own business: pending -> archived and
  -- active -> archived both stay open to them. Only publication is reserved.
  if new.listing_type = 'job'
     and new.status is distinct from old.status
     and new.status = 'active' then
    raise exception 'a job listing can only be published by an admin or a jobs module admin';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_listings_approval on public.listings;

create trigger guard_listings_approval
before insert or update on public.listings
for each row
execute function public.guard_listing_approval();

-- A trigger function needs no EXECUTE grant to fire — the executor invokes it
-- as part of the table operation. Leaving it granted only puts a SECURITY
-- DEFINER function on the public PostgREST surface, which the Supabase linter
-- flags (0028/0029). Calling it as an RPC would raise anyway, but it should not
-- be reachable at all.
revoke all on function public.guard_listing_approval() from public;
revoke all on function public.guard_listing_approval() from anon;
revoke all on function public.guard_listing_approval() from authenticated;

-- Verification:
--   As a signed-in, verified student who is NOT an admin or jobs module admin:
--
--     POST /rest/v1/listings { listing_type:"job", status:"active", ... }
--       -> 201, but the stored row reads status = 'pending'
--     PATCH /rest/v1/listings?id=eq.<own job> { "status":"active" }
--       -> ERROR: a job listing can only be published by an admin or a jobs module admin
--     PATCH /rest/v1/listings?id=eq.<own job> { "status":"archived" }
--       -> 204 (withdrawing your own listing still works)
--     PATCH /rest/v1/listings?id=eq.<own job> { "title":"new title" }
--       -> 204 (editing content still works)
--     POST /rest/v1/listings { listing_type:"book", status:"active", ... }
--       -> 201, status = 'active'   (books unchanged — instant publish)
--
--   As an admin, or a module admin holding module = 'jobs':
--     PATCH /rest/v1/listings?id=eq.<any job> { "status":"active" }
--       -> 204   (JobsAdminPanel keeps working)
