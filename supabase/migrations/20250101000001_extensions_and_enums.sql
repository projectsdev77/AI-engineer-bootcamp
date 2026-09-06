-- Extensions
create extension if not exists pgcrypto; -- gen_random_uuid()

-- Enums
create type user_role as enum ('student', 'mentor', 'admin');
create type account_status as enum ('active', 'suspended');
create type publish_status as enum ('draft', 'published');
create type resource_type as enum ('video', 'article', 'docs', 'paper', 'repo', 'tool', 'other');
create type assignment_type as enum ('quiz', 'text', 'url');
create type enrollment_status as enum ('active', 'completed', 'withdrawn');
create type unlock_source as enum ('system', 'admin');
create type eval_status as enum ('pending', 'processing', 'complete', 'failed', 'needs_review');
create type submission_status as enum ('pending', 'passed', 'needs_work');
create type submission_action as enum (
  'submitted',
  'ai_evaluated',
  'ai_failed',
  'status_overridden',
  'feedback_edited'
);
create type email_type as enum ('reengagement', 'welcome');

-- Shared trigger function for maintaining `updated_at` on editable tables.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
