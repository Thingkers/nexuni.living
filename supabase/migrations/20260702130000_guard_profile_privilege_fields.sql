-- Defense-in-depth: no RLS policy in this project should let a user set
-- their own role/verification status, but RLS row-level policies (typically
-- "auth.uid() = id") don't restrict *which columns* an authorized update
-- can touch. A user updating their own profile row could otherwise attach
-- `role: 'admin'` to the same request the profile-edit form sends and grant
-- themselves admin access.
--
-- This trigger blocks changes to the privileged columns unless the request
-- comes from the service-role key, which is what the /api/admin/* routes
-- use after already verifying the caller is an admin.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_verified is distinct from old.is_verified
     or new.verification_status is distinct from old.verification_status then
    raise exception 'role and verification fields can only be changed by an admin';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profiles_privileged_fields on public.profiles;

create trigger guard_profiles_privileged_fields
before update on public.profiles
for each row
execute function public.prevent_self_privilege_escalation();
