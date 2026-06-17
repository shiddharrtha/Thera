-- Farmer background fields collected during onboarding (step 2).
alter table public.profiles
  add column if not exists years_farming text,
  add column if not exists farm_role text,
  add column if not exists primary_goals text[];
