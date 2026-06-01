-- Run this in Supabase Dashboard → SQL Editor
-- Fixes RLS for Firebase Auth: Firebase UIDs are text, not UUIDs.
-- auth.uid() casts sub → uuid and returns NULL for Firebase users, blocking all writes.

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

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
