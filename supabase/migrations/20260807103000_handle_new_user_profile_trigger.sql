-- P0-D · handle_new_user — make profile creation survive email verification
--
-- Problem:
--   Email confirmation is currently DISABLED on this project. Verified live on
--   2026-08-07:
--
--     select count(*),
--            count(*) filter (where confirmation_sent_at is not null)
--     from auth.users;                              -> 6 users, 0 ever sent
--
--   Turning it on would break registration outright, because the profile row is
--   created by the browser immediately after signUp:
--
--     src/app/auth/register/page.tsx
--       126  await supabase.auth.signUp({ email, password })
--       154  await supabase.from('profiles').insert({ id: data.user.id, ... })
--
--   With confirmation enabled, signUp returns a user but NO session. auth.uid()
--   is NULL for that request, so the RLS INSERT policy
--   ("user can insert own profile", with_check auth.uid() = id) rejects the
--   row. The result is an auth account with no profile — a user who can sign in
--   and then hits a broken application on every page.
--
--   So email verification is not a settings toggle. It is blocked on profile
--   creation not depending on a client session.
--
-- Fix:
--   Create the profile from an AFTER INSERT trigger on auth.users, populated
--   from the sign-up metadata (raw_user_meta_data), running as SECURITY DEFINER
--   so it needs neither a session nor a policy.
--
-- Reason:
--   This is the Supabase-standard handle_new_user pattern, and it inverts the
--   trust direction that made the original design fragile: the profile row
--   becomes a server-side consequence of an account existing, rather than a
--   client-side follow-up request that may never arrive. It also closes a
--   smaller hole that exists today — a registrant can abandon the flow between
--   signUp and the profile insert and leave an orphaned auth user behind.
--
--   BACKWARD COMPATIBILITY IS THE CONSTRAINT HERE. Email confirmation is still
--   off, the browser still has a session, and src/app/auth/register/page.tsx
--   still writes the profile. Three choices keep both paths working at once:
--
--     1. `on conflict (id) do nothing` — the trigger never fights the client.
--     2. The client write becomes an UPSERT (see the paired change to
--        register/page.tsx). Trigger-first: the upsert updates the existing
--        row. Trigger-failed: the upsert creates it, exactly as today.
--     3. The trigger swallows its own errors. A malformed metadata value must
--        never abort the sign-up transaction — GoTrue would surface it as an
--        opaque "Database error saving new user" and registration would be down
--        for everyone. It warns and yields; the client upsert is the net.
--
--   WHAT THIS MIGRATION DELIBERATELY DOES NOT WRITE:
--
--   `student_id` — profiles carries UNIQUE (student_id) (profiles_student_id_
--   unique). If the trigger wrote a duplicate it would raise, be swallowed by
--   (3), and leave no profile at all; worse, that failure would be invisible.
--   Leaving it to the client keeps the unique violation where the UI can catch
--   it as PostgREST error 23505 and say "This Student ID is already
--   registered." (Note that the pre-flight duplicate check at
--   register/page.tsx:114 has never worked — it selects a column `anon` holds
--   no grant on, gets 403, discards the error and always passes. The UNIQUE
--   constraint is what actually prevents duplicates. Replacing that check with
--   a rate-limited server route is tracked separately.)
--
--   `student_id_card_url` — the upload needs a session, so it cannot happen
--   inside the sign-up transaction. This is the ONE remaining blocker on
--   enabling email confirmation: with confirmation on, the ID-card upload at
--   register/page.tsx:140 has no session either, and must move to a
--   post-confirmation step or a server route. That work is NOT in this
--   migration. Enabling confirmation before it lands would leave every new
--   registrant unverifiable.
--
--   NO EXISTING POLICY, GRANT OR TRIGGER IS ALTERED by this migration.
--
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gender text;
  v_locale text;
begin
  -- Metadata is attacker-controlled: it is whatever the browser passed to
  -- signUp(options.data). Both columns carry CHECK constraints
  -- (profiles_gender_check, profiles_locale_check), so anything unrecognised is
  -- discarded rather than allowed to raise.
  v_gender := nullif(new.raw_user_meta_data ->> 'gender', '');
  if v_gender is not null and v_gender not in ('male', 'female') then
    v_gender := null;
  end if;

  v_locale := nullif(new.raw_user_meta_data ->> 'locale', '');
  if v_locale is null or v_locale not in ('en', 'bn') then
    v_locale := 'en';
  end if;

  insert into public.profiles (
    id, email, full_name, phone, gender, university, university_id, locale,
    role, verification_status, is_verified
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_gender,
    nullif(new.raw_user_meta_data ->> 'university', ''),
    -- A malformed uuid would raise; the outer handler catches it, but casting
    -- defensively keeps the common case out of the exception path.
    case
      when (new.raw_user_meta_data ->> 'university_id') ~
           '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then (new.raw_user_meta_data ->> 'university_id')::uuid
      else null
    end,
    v_locale,
    -- Stated explicitly rather than left to guard_profiles_privileged_fields_
    -- insert. That trigger still fires and still forces these three values, so
    -- this is belt and braces: the privileged fields are correct even if the
    -- guard is ever dropped, and a reader of this function does not have to go
    -- looking for a second trigger to learn what a new account gets.
    'student', 'pending', false
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Never abort the sign-up. See reason (3) above.
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- Verification:
--   With email confirmation OFF (current setting) — nothing observable changes:
--     register a new account through /auth/register
--       -> auth.users row created
--       -> profiles row created by the trigger, then completed by the client
--          upsert with student_id + student_id_card_url
--       -> role='student', verification_status='pending', is_verified=false
--       -> /auth/pending renders as before
--
--   With email confirmation ON (not yet enabled — do not turn this on until the
--   ID-card upload has moved off the client session):
--     signUp -> no session, but
--       select count(*) from public.profiles where id = <new user>;   -> 1
--     i.e. the row exists without the client having written anything.
--
--   Metadata is not trusted:
--     signUp(options.data = { gender: 'admin', locale: 'xx' })
--       -> profiles.gender = NULL, profiles.locale = 'en'
--     signUp(options.data = { role: 'admin' })
--       -> ignored; this function never reads a role from metadata
--
--   The trigger cannot take the site down:
--     signUp(options.data = { university_id: 'not-a-uuid' })
--       -> account created, university_id NULL, no error to the user
