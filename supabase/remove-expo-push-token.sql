-- Remove Expo push token storage from profiles.
drop index if exists public.profiles_expo_push_token_idx;

alter table public.profiles
  drop column if exists expo_push_token;
