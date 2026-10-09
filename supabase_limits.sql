-- ============================================================
-- LIMITS & STORAGE HARDENING
-- Paste into: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to re-run (idempotent where possible).
--
-- OPTIONAL: run this first to inspect existing Storage policies,
-- in case there are permissive ones to review:
--   select policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'storage' and tablename = 'objects';
-- ============================================================

-- ------------------------------------------------------------
-- 1. MAX 30 WIDGETS PER USER (server-enforced, not bypassable)
-- ------------------------------------------------------------
create or replace function public.enforce_widget_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.widgets where user_id = new.user_id) >= 30 then
    raise exception 'Widget limit reached (max 30 per user)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists widgets_limit on public.widgets;
create trigger widgets_limit
  before insert on public.widgets
  for each row execute function public.enforce_widget_limit();

-- ------------------------------------------------------------
-- 2. LENGTH / VALUE LIMITS on existing data
--    NOT VALID: enforced for new & updated rows, does not break
--    existing rows. All limits sit above today's real max values.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'widgets_title_len') then
    alter table public.widgets add constraint widgets_title_len
      check (title is null or char_length(title) <= 150) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'widgets_description_len') then
    alter table public.widgets add constraint widgets_description_len
      check (description is null or char_length(description) <= 500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'widgets_content_len') then
    alter table public.widgets add constraint widgets_content_len
      check (content is null or char_length(content) <= 5000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'widgets_icon_len') then
    alter table public.widgets add constraint widgets_icon_len
      check (icon is null or char_length(icon) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'widgets_size_chk') then
    alter table public.widgets add constraint widgets_size_chk
      check (size is null or size in ('1x1', '2x1', '1x2', '2x2')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'widgets_type_chk') then
    alter table public.widgets add constraint widgets_type_chk
      check (type in ('social', 'text', 'image')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_username_chk') then
    alter table public.profiles add constraint profiles_username_chk
      check (username is null or username ~ '^[a-z0-9_]{3,15}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_len') then
    alter table public.profiles add constraint profiles_full_name_len
      check (full_name is null or char_length(full_name) <= 60) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table public.profiles add constraint profiles_bio_len
      check (bio is null or char_length(bio) <= 200) not valid;
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. STORAGE: user-content (the bucket actually in use)
--    Server-side size + mime limits (the 2MB client check alone
--    is bypassable).
-- ------------------------------------------------------------
update storage.buckets
set file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'user-content';

-- Replace any pre-existing permissive policies on user-content
-- (PERMISSIVE policies are OR-ed, so old ones would defeat the new ones).
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%user-content%' or coalesce(with_check, '') like '%user-content%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "user-content public read"
  on storage.objects for select
  using (bucket_id = 'user-content');

create policy "user-content insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "user-content update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-content'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "user-content delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 4. STORAGE: avatars (legacy, unused).
--    Close its open upload/update policies immediately.
-- ------------------------------------------------------------
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%avatars%' or coalesce(with_check, '') like '%avatars%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Delete the legacy bucket from the DASHBOARD (SQL cannot do it:
-- Supabase blocks direct deletion from storage tables with
-- "Direct deletion from storage tables is not allowed").
--   1) Empty it: run scripts/cleanup-orphans.mjs --delete (needs service_role)
--   2) Storage > avatars > ... > Delete bucket
-- (Policies for avatars were already dropped above.)

-- ------------------------------------------------------------
-- 5. visits
--    Nothing to do: the legacy `visits` table does not exist in
--    this project (if it ever comes back, drop its open insert
--    policy: drop policy "Anyone can insert visits." on public.visits;).
-- ------------------------------------------------------------
