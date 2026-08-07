-- Create roommate profiles table
create table if not exists public.roommate_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references public.profiles(id)
    on delete cascade,

  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),

  bio text,

  gender text
    check (gender in ('male', 'female')),

  age int
    check (age is null or (age >= 16 and age <= 100)),

  university_id uuid
    references public.universities(id)
    on delete set null,

  locality_id uuid
    references public.localities(id)
    on delete set null,

  budget_min int,
  budget_max int,

  sleep_schedule text
    check (sleep_schedule in ('early_bird','night_owl','flexible')),

  cleanliness_level text
    check (cleanliness_level in ('relaxed','moderate','very_clean')),

  smoking_preference text
    check (smoking_preference in ('smoker','non_smoker')),

  guest_preference text
    check (guest_preference in ('rarely','sometimes','often')),

  preferred_gender text
    check (preferred_gender in ('male','female','any')),

  preferred_university_id uuid
    references public.universities(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- Indexes
create index if not exists roommate_profiles_active_created_at_idx
on public.roommate_profiles(created_at desc)
where status = 'active';


create index if not exists roommate_profiles_university_id_idx
on public.roommate_profiles(university_id);


create index if not exists roommate_profiles_locality_id_idx
on public.roommate_profiles(locality_id);



-- Enable RLS
alter table public.roommate_profiles enable row level security;



----------------------------------------------------
-- Remove existing policies before recreating
----------------------------------------------------

drop policy if exists 
"roommate_profiles read: owner, admin, or active+verified"
on public.roommate_profiles;


drop policy if exists
"roommate_profiles insert: own row, verified only"
on public.roommate_profiles;


drop policy if exists
"roommate_profiles update: own row"
on public.roommate_profiles;



----------------------------------------------------
-- SELECT POLICY
----------------------------------------------------

create policy 
"roommate_profiles read: owner, admin, or active+verified"

on public.roommate_profiles

for select

using (

  -- owner can always see own profile
  auth.uid() = user_id


  -- admin access
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )


  -- public discovery
  or (
    status = 'active'

    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and verification_status = 'approved'
    )

  )

);



----------------------------------------------------
-- INSERT POLICY
----------------------------------------------------

create policy
"roommate_profiles insert: own row, verified only"

on public.roommate_profiles

for insert

with check (

  auth.uid() = user_id

  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and verification_status = 'approved'
  )

);



----------------------------------------------------
-- UPDATE POLICY
----------------------------------------------------

create policy
"roommate_profiles update: own row"

on public.roommate_profiles

for update

using (
  auth.uid() = user_id
)

with check (
  auth.uid() = user_id
);
