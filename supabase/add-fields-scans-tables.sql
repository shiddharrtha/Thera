-- Run in Supabase Dashboard → SQL Editor (safe to run on existing projects).
-- Creates fields, scans, and reports tables with Firebase-compatible RLS.

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

create index if not exists fields_user_id_idx on public.fields(user_id);

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

create index if not exists scans_field_id_idx on public.scans(field_id);
create index if not exists scans_user_id_idx on public.scans(user_id);

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

create index if not exists reports_field_id_idx on public.reports(field_id);
create index if not exists reports_scan_id_idx on public.reports(scan_id);
create index if not exists reports_user_id_idx on public.reports(user_id);

alter table public.fields enable row level security;
alter table public.scans enable row level security;
alter table public.reports enable row level security;

-- Fields policies
drop policy if exists "Users read own fields" on public.fields;
drop policy if exists "Users insert own fields" on public.fields;
drop policy if exists "Users update own fields" on public.fields;
drop policy if exists "Users delete own fields" on public.fields;

create policy "Users read own fields"
  on public.fields for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users insert own fields"
  on public.fields for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users update own fields"
  on public.fields for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users delete own fields"
  on public.fields for delete
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- Scans policies
drop policy if exists "Users read own scans" on public.scans;
drop policy if exists "Users insert own scans" on public.scans;
drop policy if exists "Users update own scans" on public.scans;
drop policy if exists "Users delete own scans" on public.scans;

create policy "Users read own scans"
  on public.scans for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users insert own scans"
  on public.scans for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users update own scans"
  on public.scans for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users delete own scans"
  on public.scans for delete
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- Reports policies
drop policy if exists "Users read own reports" on public.reports;
drop policy if exists "Users insert own reports" on public.reports;
drop policy if exists "Users update own reports" on public.reports;
drop policy if exists "Users delete own reports" on public.reports;

create policy "Users read own reports"
  on public.reports for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users insert own reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users update own reports"
  on public.reports for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users delete own reports"
  on public.reports for delete
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
