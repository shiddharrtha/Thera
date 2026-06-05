-- Run in Supabase Dashboard → SQL Editor (safe to run on existing projects).

alter table public.profiles
  add column if not exists farm_name text,
  add column if not exists primary_region text,
  add column if not exists default_crop text,
  add column if not exists preferred_units text check (preferred_units in ('imperial', 'metric')),
  add column if not exists approximate_acres numeric,
  add column if not exists onboarding_complete boolean not null default false;
