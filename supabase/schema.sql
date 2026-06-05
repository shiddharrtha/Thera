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
