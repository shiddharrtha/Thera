-- Additional farmer background fields on profiles.
alter table public.profiles
  add column if not exists birthday date,
  add column if not exists age integer,
  add column if not exists field_count integer,
  add column if not exists main_crop text;
