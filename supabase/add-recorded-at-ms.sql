-- Run in Supabase Dashboard → SQL Editor.
-- Stores the exact device recording instant (UTC epoch ms) to avoid timezone parsing issues.

alter table public.scans
  add column if not exists recorded_at_ms bigint;

alter table public.reports
  add column if not exists recorded_at_ms bigint;

-- Backfill existing rows from created_at (UTC).
update public.scans
set recorded_at_ms = (extract(epoch from created_at) * 1000)::bigint
where recorded_at_ms is null;

update public.reports
set recorded_at_ms = (extract(epoch from created_at) * 1000)::bigint
where recorded_at_ms is null;
