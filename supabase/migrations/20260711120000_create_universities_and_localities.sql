-- Create universities table
create table if not exists public.universities (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    name_bn text,
    slug text not null unique,
    type text check (type in ('public', 'private')),
    city text,
    division text,
    lat double precision,
    lng double precision,
    aliases jsonb not null default '[]'::jsonb,
    logo_url text,
    website text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);


-- Create localities table
create table if not exists public.localities (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    name_bn text,
    slug text not null unique,
    thana text,
    city text,
    division text,
    lat double precision,
    lng double precision,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);


-- Create locality university mapping table
create table if not exists public.locality_university (
    id uuid primary key default gen_random_uuid(),
    locality_id uuid not null references public.localities(id) on delete cascade,
    university_id uuid not null references public.universities(id) on delete cascade,
    distance_km numeric(5,2),
    commute_minutes int,
    created_at timestamptz not null default now(),

    unique(locality_id, university_id)
);


-- Indexes
create index if not exists localities_city_idx
on public.localities(city);


create index if not exists locality_university_university_id_idx
on public.locality_university(university_id);



-- Enable RLS
alter table public.universities enable row level security;
alter table public.localities enable row level security;
alter table public.locality_university enable row level security;



----------------------------------------------------
-- UNIVERSITIES POLICIES
----------------------------------------------------

drop policy if exists "public can view active universities"
on public.universities;

create policy "public can view active universities"
on public.universities
for select
using (is_active);



drop policy if exists "admin can manage universities"
on public.universities;

create policy "admin can manage universities"
on public.universities
for all
using (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);



----------------------------------------------------
-- LOCALITIES POLICIES
----------------------------------------------------

drop policy if exists "public can view active localities"
on public.localities;


create policy "public can view active localities"
on public.localities
for select
using (is_active);



drop policy if exists "admin can manage localities"
on public.localities;


create policy "admin can manage localities"
on public.localities
for all
using (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);



----------------------------------------------------
-- LOCALITY UNIVERSITY POLICIES
----------------------------------------------------

drop policy if exists "public can view locality university links"
on public.locality_university;


create policy "public can view locality university links"
on public.locality_university
for select
using (true);



drop policy if exists "admin can manage locality university links"
on public.locality_university;


create policy "admin can manage locality university links"
on public.locality_university
for all
using (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);



----------------------------------------------------
-- UNIVERSITY SEED
----------------------------------------------------

insert into public.universities
(name,name_bn,slug,type,city,division,lat,lng,aliases,website)

values

(
'American International University-Bangladesh',
'আমেরিকান ইন্টারন্যাশনাল ইউনিভার্সিটি-বাংলাদেশ',
'aiub',
'private',
'Dhaka',
'Dhaka',
23.8261,
90.4249,
'["AIUB"]'::jsonb,
'https://www.aiub.edu'
),

(
'North South University',
'নর্থ সাউথ ইউনিভার্সিটি',
'nsu',
'private',
'Dhaka',
'Dhaka',
23.8140,
90.4257,
'["NSU"]'::jsonb,
'https://www.northsouth.edu'
),

(
'BRAC University',
'ব্র্যাক বিশ্ববিদ্যালয়',
'brac-university',
'private',
'Dhaka',
'Dhaka',
23.7808,
90.4257,
'["BRAC","BRACU"]'::jsonb,
'https://www.bracu.ac.bd'
)

on conflict(slug)
do nothing;



----------------------------------------------------
-- LOCALITY SEED
----------------------------------------------------

insert into public.localities
(name,name_bn,slug,thana,city,division,lat,lng)

values

(
'Kuril',
'কুড়িল',
'kuril',
'Khilkhet',
'Dhaka',
'Dhaka',
23.8259,
90.4204
),

(
'Bashundhara R/A',
'বসুন্ধরা আবাসিক এলাকা',
'bashundhara-ra',
'Bashundhara',
'Dhaka',
'Dhaka',
23.8151,
90.4295
),

(
'Badda',
'বাড্ডা',
'badda',
'Badda',
'Dhaka',
'Dhaka',
23.7805,
90.4266
)

on conflict(slug)
do nothing;



----------------------------------------------------
-- LOCALITY UNIVERSITY LINKS
----------------------------------------------------

insert into public.locality_university
(locality_id, university_id, distance_km, commute_minutes)

select
l.id,
u.id,
v.distance_km,
v.commute_minutes

from
(
values

('kuril','aiub',1.2,8),
('kuril','nsu',2.0,12),
('bashundhara-ra','nsu',0.6,5),
('bashundhara-ra','brac-university',3.0,15),
('badda','brac-university',0.8,6)

)

as v(locality_slug, university_slug, distance_km, commute_minutes)


join public.localities l
on l.slug=v.locality_slug


join public.universities u
on u.slug=v.university_slug


on conflict(locality_id,university_id)
do nothing;