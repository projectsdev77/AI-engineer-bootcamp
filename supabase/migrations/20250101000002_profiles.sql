-- profiles: one row per auth user (5.1)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role user_role not null default 'student',
  status account_status not null default 'active',
  background text,
  weekly_hours_target int,
  onboarding_completed_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index profiles_role_idx on profiles (role);
create index profiles_last_active_at_idx on profiles (last_active_at);

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

-- Creates a profile row whenever a new auth user signs up. Runs as the
-- table owner (security definer) because the invoking session has no
-- rights on `profiles` yet at signup time.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Returns the calling user's role without ever selecting from `profiles`
-- inside a `profiles` RLS policy, which would recurse. Security definer
-- lets it read `profiles` under its own privileges regardless of caller.
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'admin', false);
$$;

create or replace function is_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'mentor', false);
$$;
