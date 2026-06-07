-- Migration: create automation_templates
-- Spec: admin-templates-visitors (Req 2.1, 2.2, 2.3, 2.4, 2.5)
--
-- Policy (Req 20): this file is a committed SQL artifact only.
-- The Admin_Dashboard application never runs migrations at build, deploy,
-- or runtime. Apply manually via the Supabase dashboard SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.automation_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      text not null,
  tags          text[],
  workflow_json jsonb not null,
  status        text not null default 'draft'
                check (status in ('draft', 'published')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists automation_templates_created_at_idx
  on public.automation_templates (created_at desc);

create index if not exists automation_templates_status_category_idx
  on public.automation_templates (status, category);
