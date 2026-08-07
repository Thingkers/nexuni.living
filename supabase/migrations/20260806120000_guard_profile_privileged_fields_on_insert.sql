-- Sprint 0 / P0-1 — Privilege escalation via self-signup.
--
-- Finding (docs/audit-2026-08-06.md §1 P0-1): 20260702130000_guard_profile_
-- privilege_fields.sql added prevent_self_privilege_escalation() to stop a
-- user attaching `role: 'admin'` to their own profile edit — but the trigger
-- it created is BEFORE **UPDATE** only. The INSERT path was never covered,
-- and `authenticated` holds a table-wide INSERT grant that includes the
-- role / is_verified / verification_status columns. Verified live:
--
--   pg_trigger:  guard_profiles_privileged_fields | profiles | UPDATE | BEFORE
--   grants:      authenticated INSERT -> (all 17 columns, incl. role)
--   pg_policies: profiles INSERT with_check = (auth.uid() = id)
--
-- So any visitor could register normally, skip the app's own insert, and
-- POST /rest/v1/profiles with {"id": "<their uid>", "role": "admin",
-- "verification_status": "approved", "is_verified": true}. RLS passes
-- (auth.uid() = id) and no trigger fires. That is a full admin takeover from
-- an unauthenticated starting point.
--
-- Fix, in two independent layers:
--
--   1. A BEFORE INSERT trigger that *forces* the three privileged columns to
--      their safe values for every non-service_role caller. This alone closes
--      the hole, and it closes it for any future insert path too (a Server
--      Action, an admin tool, a seed script) rather than only for the one
--      call site the app happens to use today.
--
--   2. Column-level INSERT grants, so the request is rejected by the
--      privilege system before the trigger even runs. Defense in depth: if
--      the trigger is ever dropped or replaced, the grant still holds.
--
-- Why a separate function instead of extending prevent_self_privilege_
-- escalation(): that function reads OLD, which does not exist on INSERT, so
-- reusing it would need a TG_OP branch and would make one function
-- responsible for two different rules. Keeping them apart also means this
-- migration never edits the existing trigger — nothing about the UPDATE path
-- changes here.
--
-- NOTE on the UPDATE path: it is deliberately NOT touched in this sprint.
-- prevent_self_privilege_escalation() already blocks role/is_verified/
-- verification_status changes on UPDATE and is proven in production, so
-- there is no open hole to close. Converting `profiles` UPDATE to a column
-- allowlist is real breakage risk (every profile-edit field must be
-- enumerated correctly) for no security gain, so it belongs with the full
-- RLS rewrite in Sprint 2, not in an emergency containment sprint.

create or replace function public.force_profile_defaults_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The /api/admin/* routes use the service-role key and have already
  -- verified the caller is an admin before they get here. Same escape hatch
  -- prevent_self_privilege_escalation() uses, for the same reason.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Set unconditionally rather than raising on mismatch: a client that omits
  -- these columns and a client that sends `role: 'admin'` both end up with a
  -- plain pending student, so registration cannot be made to fail by a
  -- crafted payload, and the app's own insert needs no error handling.
  new.role                := 'student';
  new.verification_status := 'pending';
  new.is_verified         := false;

  return new;
end;
$$;

drop trigger if exists guard_profiles_privileged_fields_insert on public.profiles;

create trigger guard_profiles_privileged_fields_insert
before insert on public.profiles
for each row
execute function public.force_profile_defaults_on_insert();

-- Layer 2: column-level INSERT grants.
--
-- Postgres cannot revoke a column-level privilege that was granted at the
-- table level — the revoke silently does nothing. The only way to narrow it
-- is to drop the table-wide grant and re-grant the allowed columns
-- explicitly, which is the same pattern 20260702170000_restrict_anon_
-- profile_columns.sql used for SELECT.
revoke insert on public.profiles from anon, authenticated;

-- Every column except role / is_verified / verification_status, which the
-- trigger above now owns. `anon` gets nothing: the registration insert runs
-- after signUp() has returned a session, so it is always `authenticated`.
grant insert (
  id,
  full_name,
  email,
  phone,
  gender,
  university,
  university_id,
  student_id,
  student_id_card_url,
  avatar_url,
  bkash_number,
  nagad_number,
  locale,
  created_at
) on public.profiles to authenticated;

-- Verification (run as a plain student, expect all three to hold):
--   insert into public.profiles (id, full_name, role)
--   values (auth.uid(), 'x', 'admin');
--     -> ERROR: permission denied for column role
--   insert into public.profiles (id, full_name) values (auth.uid(), 'x');
--     -> row created with role = 'student', verification_status = 'pending',
--        is_verified = false
--   select role from public.profiles where id = auth.uid();
--     -> 'student'
