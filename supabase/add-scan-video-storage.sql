-- Run in Supabase Dashboard → SQL Editor (requires project owner / dashboard SQL editor).
-- Creates the private scan-videos bucket and RLS policies for Firebase-authenticated users.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-videos',
  'scan-videos',
  false,
  524288000,
  array['video/mp4', 'video/quicktime', 'video/x-m4v']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own scan videos" on storage.objects;
drop policy if exists "Users read own scan videos" on storage.objects;
drop policy if exists "Users update own scan videos" on storage.objects;
drop policy if exists "Users delete own scan videos" on storage.objects;

create policy "Users upload own scan videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scan-videos'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users read own scan videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scan-videos'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users update own scan videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'scan-videos'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  )
  with check (
    bucket_id = 'scan-videos'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users delete own scan videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'scan-videos'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );
