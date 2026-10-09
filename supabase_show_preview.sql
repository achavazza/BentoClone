-- Per-box opt-out for the link preview background + optional custom cover image.
-- Run this once in Supabase > SQL Editor. Idempotent (safe to re-run).
alter table widgets
  add column if not exists show_preview boolean not null default true,
  add column if not exists background_url text;