-- Problem: docs/module-verticals-roadmap.md Sprint 1 -- the user wants
-- Books/Local Services/Jobs/Transport each independently assignable to a
-- separate admin, distinct from the single global admin role, without
-- touching profiles.role (which has no enum/check constraint and is
-- already guarded by prevent_self_privilege_escalation(), see
-- 20260702130000_guard_profile_privilege_fields.sql -- a
-- new column there would fight that trigger and couldn't express one
-- profile administering multiple modules).
--
-- Fix: a new, separate module_admins table (one row per user+module) plus
-- an is_module_admin() helper that new module-scoped RLS policies can call,
-- so every existing policy's `exists(select 1 from profiles where
-- role = 'admin')` idiom stays untouched. See
-- docs/module-admin-architecture.md for the full design note, including
-- why this is a *module*-scoped concept and not the *geography*-scoped
-- moderator_scopes concept described in docs/feature-breakdown.md §5.
--
-- No application code reads or writes this table yet -- that starts in
-- Sprint 2 (docs/module-verticals-roadmap.md).

create table public.module_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in ('books', 'services', 'jobs', 'transport')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, module)
);

create index module_admins_user_id_idx on public.module_admins (user_id);

alter table public.module_admins enable row level security;

-- One combined SELECT policy -- see
-- 20260702160000_remove_redundant_rooms_visibility_policies.sql for why
-- stacked permissive policies are avoided in this codebase.
create policy "module_admins read: self or admin" on public.module_admins
for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only a global admin may create/change/remove module-admin assignments.
create policy "module_admins write: admin only" on public.module_admins
for all
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Parameterized version of the admin-bypass idiom repeated across every
-- other RLS-enabled table in this codebase. security definer so it can read
-- module_admins/profiles regardless of the calling policy's own RLS
-- context; search_path pinned per Postgres's security-definer-function
-- guidance.
create or replace function public.is_module_admin(p_module text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.module_admins
      where user_id = auth.uid() and module = p_module
    )
$$;
