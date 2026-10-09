-- ============================================================
-- box_previews: cache of link previews (OG metadata) per widget
-- Paste this into: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

create table if not exists public.box_previews (
  id uuid primary key default gen_random_uuid(),
  -- NOTE: widgets.id is bigint (identity), not uuid
  widget_id bigint not null unique references public.widgets(id) on delete cascade,
  url text,
  title text,
  description text,
  image_url text,
  favicon_url text,
  platform text not null default 'generic'
    check (platform in ('github', 'youtube', 'spotify', 'vimeo', 'behance', 'linkedin', 'generic')),
  raw_metadata jsonb,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: everyone can read, nobody but the service_role can write.
-- There is deliberately NO insert/update policy: the anon key cannot
-- write. The Vercel function uses the service_role key, which bypasses RLS.
alter table public.box_previews enable row level security;

create policy "Anyone can read previews"
  on public.box_previews
  for select
  using (true);

-- Helpful index for the join widgets -> box_previews
create index if not exists box_previews_widget_id_idx on public.box_previews (widget_id);
