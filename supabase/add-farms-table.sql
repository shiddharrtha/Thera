-- Multi-farm support: farms table + farm_id on fields + selected farm on profiles

create table if not exists public.farms (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  primary_region text,
  default_crop text,
  preferred_units text check (preferred_units in ('imperial', 'metric')),
  approximate_acres numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farms_user_id_idx on public.farms(user_id);

alter table public.farms enable row level security;

drop policy if exists "Users read own farms" on public.farms;
drop policy if exists "Users insert own farms" on public.farms;
drop policy if exists "Users update own farms" on public.farms;
drop policy if exists "Users delete own farms" on public.farms;

create policy "Users read own farms"
  on public.farms for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users insert own farms"
  on public.farms for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users update own farms"
  on public.farms for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users delete own farms"
  on public.farms for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

alter table public.fields
  add column if not exists farm_id text references public.farms(id) on delete cascade;

create index if not exists fields_farm_id_idx on public.fields(farm_id);

alter table public.profiles
  add column if not exists selected_farm_id text references public.farms(id) on delete set null;

-- Backfill one farm per onboarded profile
insert into public.farms (id, user_id, name, primary_region, default_crop, preferred_units, approximate_acres)
select
  'farm_' || p.id,
  p.id,
  coalesce(nullif(trim(p.farm_name), ''), 'My Farm'),
  p.primary_region,
  p.default_crop,
  coalesce(p.preferred_units, 'imperial'),
  coalesce(p.approximate_acres, 0)
from public.profiles p
where p.onboarding_complete = true
  and coalesce(nullif(trim(p.farm_name), ''), '') <> ''
on conflict (id) do nothing;

update public.fields fi
set farm_id = 'farm_' || fi.user_id
where fi.farm_id is null
  and exists (select 1 from public.farms f where f.id = 'farm_' || fi.user_id);

insert into public.farms (id, user_id, name)
select 'farm_' || fi.user_id, fi.user_id, 'My Farm'
from public.fields fi
where fi.farm_id is null
group by fi.user_id
on conflict (id) do nothing;

update public.fields fi
set farm_id = 'farm_' || fi.user_id
where fi.farm_id is null;

update public.profiles p
set selected_farm_id = 'farm_' || p.id
where p.onboarding_complete = true
  and p.selected_farm_id is null
  and exists (select 1 from public.farms f where f.id = 'farm_' || p.id);
