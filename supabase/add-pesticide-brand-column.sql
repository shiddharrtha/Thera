-- Pesticide brand on farmer background (profiles).
alter table public.profiles
  add column if not exists pesticide_brand text;
