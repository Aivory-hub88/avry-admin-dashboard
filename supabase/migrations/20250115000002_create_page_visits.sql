-- Migration: create page_visits
-- Spec: admin-templates-visitors (Req 11.1, 11.2, 11.3)
--
-- Policy (Req 20): this file is a committed SQL artifact only.
-- The Admin_Dashboard application never runs migrations at build, deploy,
-- or runtime. Apply manually via the Supabase dashboard SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.page_visits (
  id           uuid primary key default gen_random_uuid(),
  page         text not null,
  country_code text,
  country_name text,
  city         text,
  referrer     text,
  user_agent   text,
  visited_at   timestamptz not null default now()
);

create index if not exists page_visits_visited_at_idx
  on public.page_visits (visited_at desc);

create index if not exists page_visits_country_code_idx
  on public.page_visits (country_code);

create index if not exists page_visits_page_idx
  on public.page_visits (page);
