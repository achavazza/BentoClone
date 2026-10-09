-- Per-box opt-out for the link preview background.
-- Run this once in Supabase > SQL Editor.
alter table widgets
  add column if not exists show_preview boolean not null default true;