-- Migration: 001_newsletter
-- Creates the newsletter_subscribers table

create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);
