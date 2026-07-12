-- Local-dev seed data. Applied automatically by `supabase db reset`; NOT
-- applied automatically by `supabase db push` against a linked/production
-- project. The same rows are also inserted directly inside
-- 20260711120000_create_universities_and_localities.sql so that production
-- (and any environment where this file is never run) still has real
-- universities/localities data for the profile-backfill step in
-- 20260711130000_add_university_locality_refs_to_profiles_and_rooms.sql.
-- This file exists as a convenient, explicit place to re-seed a local
-- database and as living documentation of the seed set.
--
-- Idempotent via `on conflict (...) do nothing` — deliberately NOT
-- `do update`, so re-running this after an admin has edited a row in Studio
-- (corrected lat/lng, added a logo, etc.) never silently overwrites that
-- edit.
--
-- Coordinates are best-effort approximations from general knowledge, not
-- verified against a mapping API — fine for development, but spot-check
-- before relying on them for production distance accuracy.

insert into public.universities (name, name_bn, slug, type, city, division, lat, lng, aliases, website)
values
  ('American International University-Bangladesh', 'আমেরিকান ইন্টারন্যাশনাল ইউনিভার্সিটি-বাংলাদেশ', 'aiub', 'private', 'Dhaka', 'Dhaka', 23.8261, 90.4249, '["AIUB"]'::jsonb, 'https://www.aiub.edu'),
  ('North South University', 'নর্থ সাউথ ইউনিভার্সিটি', 'nsu', 'private', 'Dhaka', 'Dhaka', 23.8140, 90.4257, '["NSU"]'::jsonb, 'https://www.northsouth.edu'),
  ('Manarat International University', 'মানারাত ইন্টারন্যাশনাল ইউনিভার্সিটি', 'miu', 'private', 'Dhaka', 'Dhaka', 23.8087, 90.3654, '["MIU", "Manarat"]'::jsonb, 'https://www.manarat.ac.bd'),
  ('BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়', 'brac-university', 'private', 'Dhaka', 'Dhaka', 23.7808, 90.4257, '["BRAC", "BRACU"]'::jsonb, 'https://www.bracu.ac.bd'),
  ('Independent University, Bangladesh', 'ইনডিপেন্ডেন্ট ইউনিভার্সিটি, বাংলাদেশ', 'iub', 'private', 'Dhaka', 'Dhaka', 23.8154, 90.4249, '["IUB"]'::jsonb, 'https://www.iub.edu.bd'),
  ('United International University', 'ইউনাইটেড ইন্টারন্যাশনাল ইউনিভার্সিটি', 'uiu', 'private', 'Dhaka', 'Dhaka', 23.8073, 90.4297, '["UIU"]'::jsonb, 'https://www.uiu.ac.bd'),
  ('Ahsanullah University of Science and Technology', 'আহছানউল্লা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'aust', 'private', 'Dhaka', 'Dhaka', 23.7629, 90.3945, '["AUST"]'::jsonb, 'https://www.aust.edu'),
  ('Daffodil International University', 'ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি', 'diu', 'private', 'Dhaka', 'Dhaka', 23.8951, 90.3494, '["DIU"]'::jsonb, 'https://www.daffodilvarsity.edu.bd'),
  ('Southeast University', 'সাউথইস্ট বিশ্ববিদ্যালয়', 'southeast-university', 'private', 'Dhaka', 'Dhaka', 23.7639, 90.3927, '["SEU"]'::jsonb, 'https://www.seu.edu.bd'),
  ('Uttara University', 'উত্তরা বিশ্ববিদ্যালয়', 'uttara-university', 'private', 'Dhaka', 'Dhaka', 23.8759, 90.3795, '["UU"]'::jsonb, 'https://www.uttarauniversity.edu.bd')
on conflict (slug) do nothing;

insert into public.localities (name, name_bn, slug, thana, city, division, lat, lng)
values
  ('Kuril', 'কুড়িল', 'kuril', 'Khilkhet', 'Dhaka', 'Dhaka', 23.8259, 90.4204),
  ('Bashundhara R/A', 'বসুন্ধরা আবাসিক এলাকা', 'bashundhara-ra', 'Bashundhara', 'Dhaka', 'Dhaka', 23.8151, 90.4295),
  ('Badda', 'বাড্ডা', 'badda', 'Badda', 'Dhaka', 'Dhaka', 23.7805, 90.4266),
  ('Notun Bazar', 'নতুন বাজার', 'notun-bazar', 'Gulshan', 'Dhaka', 'Dhaka', 23.7961, 90.4245),
  ('Mohakhali', 'মহাখালী', 'mohakhali', 'Gulshan', 'Dhaka', 'Dhaka', 23.7797, 90.4066),
  ('Mirpur-10', 'মিরপুর-১০', 'mirpur-10', 'Mirpur', 'Dhaka', 'Dhaka', 23.8069, 90.3687),
  ('Mirpur-1', 'মিরপুর-১', 'mirpur-1', 'Mirpur', 'Dhaka', 'Dhaka', 23.7961, 90.3565),
  ('Uttara Sector 3', 'উত্তরা সেক্টর-৩', 'uttara-sector-3', 'Uttara', 'Dhaka', 'Dhaka', 23.8747, 90.3982),
  ('Uttara Sector 7', 'উত্তরা সেক্টর-৭', 'uttara-sector-7', 'Uttara', 'Dhaka', 'Dhaka', 23.8689, 90.3795),
  ('Khilkhet', 'খিলক্ষেত', 'khilkhet', 'Khilkhet', 'Dhaka', 'Dhaka', 23.8262, 90.4270)
on conflict (slug) do nothing;

insert into public.locality_university (locality_id, university_id, distance_km, commute_minutes)
select l.id, u.id, v.distance_km, v.commute_minutes
from (
  values
    ('kuril', 'aiub', 1.2, 8),
    ('kuril', 'nsu', 2.0, 12),
    ('kuril', 'uiu', 2.8, 15),
    ('bashundhara-ra', 'nsu', 0.6, 5),
    ('bashundhara-ra', 'iub', 0.5, 4),
    ('bashundhara-ra', 'aiub', 2.0, 12),
    ('badda', 'uiu', 1.0, 7),
    ('badda', 'brac-university', 0.8, 6),
    ('badda', 'nsu', 2.5, 14),
    ('notun-bazar', 'brac-university', 1.5, 10),
    ('notun-bazar', 'nsu', 1.8, 11),
    ('notun-bazar', 'uiu', 1.6, 10),
    ('mohakhali', 'brac-university', 2.2, 13),
    ('mohakhali', 'aust', 3.5, 18),
    ('mirpur-10', 'miu', 3.0, 16),
    ('mirpur-10', 'southeast-university', 5.5, 25),
    ('mirpur-1', 'miu', 2.5, 14),
    ('uttara-sector-3', 'uttara-university', 1.0, 7),
    ('uttara-sector-3', 'diu', 6.0, 22),
    ('uttara-sector-7', 'uttara-university', 1.8, 10),
    ('khilkhet', 'aiub', 0.8, 6),
    ('khilkhet', 'uiu', 3.2, 17)
) as v(locality_slug, university_slug, distance_km, commute_minutes)
join public.localities l on l.slug = v.locality_slug
join public.universities u on u.slug = v.university_slug
on conflict (locality_id, university_id) do nothing;
