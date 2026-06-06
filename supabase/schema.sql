-- Run in Supabase Dashboard → SQL Editor after Firebase third-party auth is enabled.

create table if not exists public.profiles (
  id text primary key,
  email text not null,
  full_name text,
  farm_name text,
  primary_region text,
  default_crop text,
  preferred_units text check (preferred_units in ('imperial', 'metric')),
  approximate_acres numeric,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Firebase UIDs are text (not UUID). Use auth.jwt()->>'sub', not auth.uid().
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.jwt()->>'sub') = id);

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = id);

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.jwt()->>'sub') = id)
  with check ((select auth.jwt()->>'sub') = id);

-- Fields, scans, and reports (see add-fields-scans-tables.sql for full migration on existing projects)

create table if not exists public.fields (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  crop_type text not null,
  acreage numeric not null,
  planting_date date,
  location text,
  has_boundary boolean not null default false,
  health_score numeric,
  open_issues integer not null default 0,
  total_savings numeric not null default 0,
  last_scan_at timestamptz,
  status text not null default 'unscanned'
    check (status in ('unscanned', 'healthy', 'warning', 'critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scans (
  id text primary key,
  field_id text not null references public.fields(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'completed', 'failed')),
  progress integer not null default 0,
  weed_coverage numeric,
  stress_coverage numeric,
  health_score numeric,
  is_first_scan boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reports (
  id text primary key,
  scan_id text not null references public.scans(id) on delete cascade,
  field_id text not null references public.fields(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  summary text not null,
  recommended_spray_acres numeric not null,
  estimated_savings numeric not null,
  chemical_reduction_percent numeric not null,
  health_score numeric not null,
  severity text not null
    check (severity in ('unscanned', 'healthy', 'warning', 'critical')),
  findings_count integer not null default 0,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
