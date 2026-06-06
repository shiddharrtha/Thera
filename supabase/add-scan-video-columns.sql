-- Run in Supabase Dashboard → SQL Editor (safe on existing projects).
-- Adds scan video metadata columns to public.scans.

alter table public.scans
  add column if not exists video_url text,
  add column if not exists video_duration_seconds integer,
  add column if not exists gps_track jsonb not null default '[]'::jsonb;
