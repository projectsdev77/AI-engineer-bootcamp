-- Lets an invited account (currently just admin-invite-mentor) specify its
-- role at creation via raw_user_meta_data, instead of always landing as
-- 'student' and needing a follow-up UPDATE. That follow-up would otherwise
-- race auto_assign_mentor (20250101000020): the profile row briefly exists
-- with role='student' the instant it's inserted, which is exactly what
-- that trigger fires on — a soon-to-be mentor would get assigned a mentor
-- of their own before the role update ever ran. Setting the real role in
-- the same insert sidesteps that window entirely.
--
-- Every existing signup path (email/password, Google OAuth) never sets a
-- `role` key in user metadata, so coalesce(..., 'student') preserves
-- today's behavior exactly.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'role', 'student')::user_role
  );
  return new;
end;
$$;
