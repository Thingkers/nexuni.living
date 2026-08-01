# `module_admins` — per-vertical admin scoping

## Why this exists

The user wants Books, Local Services, Jobs, and Transport each manageable by
a separate admin — a Books admin, a Services admin, and so on — independent
of the single global admin role, while all approved content still surfaces
together on the public site. See `docs/module-verticals-roadmap.md` for the
full multi-sprint plan this schema is the foundation for.

## Not to be confused with: geography-scoped moderators

`docs/feature-breakdown.md` §5 and `docs/playbook.md` Sprint 5 already
describe a *different* scoped-admin concept: a `moderator` role backed by a
`moderator_scopes` table keyed by `university_id`/`locality_id` — "this
moderator sees only AIUB-area content." That concept is **not implemented**
(`useViewerCapabilities.ts`'s `isModerator` flag is dead/unwired — nothing
currently grants `role='moderator'`).

`module_admins` is orthogonal to that: it scopes by **module** (Books,
Services, Jobs, Transport), not by campus or city. A Books admin manages
every book listing everywhere, not just one campus's. The two concepts could
theoretically compose later (an admin scoped to both a locality and a
module), but that composition is out of scope here.

## Schema

`supabase/migrations/20260730150000_create_module_admins.sql`:

```sql
create table public.module_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in ('books', 'services', 'jobs', 'transport')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, module)
);
```

A separate table, not a `profiles` column:

- `profiles.role` has no enum/check constraint (the table predates this
  repo's migration history) and is guarded by
  `prevent_self_privilege_escalation()` (`20260702130000`), which blocks
  non-service-role writes to `role`/`is_verified`/`verification_status`. A
  new table sidesteps that trigger entirely instead of fighting it.
- One profile can administer multiple modules (one row per
  `(user_id, module)`), which a single `role` value couldn't express
  cleanly.
- `profiles.role` stays exactly `'student' | 'admin'` as it functions today
  — module-admin-ness is entirely determined by rows in `module_admins`, and
  a plain `'student'` profile can hold module-admin rows without ever
  becoming a global admin.

## RLS

```sql
create policy "module_admins read: self or admin" on public.module_admins
for select using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "module_admins write: admin only" on public.module_admins
for all
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

Only a global admin may create or remove module-admin assignments. A user
can read their own assignment rows (so the UI/proxy can render "you
administer Books" and `src/proxy.ts` can check it server-side).

## `is_module_admin()` helper

Every existing RLS policy in this codebase repeats the same inline idiom,
`exists (select 1 from profiles where id = auth.uid() and role = 'admin')`.
Rather than editing any of those (this repo's hard rule: never modify
existing RLS policies without a before/after review), new module-scoped
policies call one new helper instead:

```sql
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
```

A global admin always satisfies `is_module_admin(anything)`; a module admin
only satisfies it for their assigned module(s).

### The singular/plural mapping

`module_admins.module` uses plural values (`'books'`, `'jobs'`, `'services'`,
`'transport'`) matching route slugs and `ModuleKey` in `src/config/modules.ts`.
`listings.listing_type` uses singular values (`'book'`, `'job'`) matching the
detail-table names (`listing_book_details`, `listing_job_details`). Any
policy bridging the two must concatenate explicitly —
`public.is_module_admin(listing_type || 's')` — which is correct for both
words (plain English plurals) but easy to miss. Every migration that does
this bridging carries an explicit SQL comment calling it out.

## What module admins can do

Per the user's explicit choice: **full edit + delete**, not just
approve/archive, on their assigned module's content. RLS policies scoped by
`is_module_admin()` use `for all` (select/insert/update/delete), matching
the same ceiling a global admin already has over that content — a module
admin's power is the global admin's power, narrowed to one module instead
of everything.

## `src/proxy.ts` extension

`ADMIN_ROUTES = ['/admin']` today gates on a single binary check
(`profile.role === 'admin'`). This gains one additive branch: if a
non-global-admin user hits one of four new `/admin/<module>` prefixes, the
proxy checks `module_admins` for a matching row before redirecting. Every
other `/admin/*` path (`/admin/users`, `/admin/rooms`, `/admin/reports`,
bare `/admin`) keeps the exact existing global-admin-only behavior — see
`docs/module-verticals-roadmap.md` Sprint 2 for the implementation.

## What's deliberately not done here

No application code reads or writes `module_admins` yet in Sprint 1 — no
proxy changes, no assignment UI, no admin nav changes. That's Sprint 2
onward in `docs/module-verticals-roadmap.md`, each its own verified step.
