-- auto_assign_mentor() picked any role='mentor', status='active' profile —
-- but admin-invite-mentor creates that profile row the instant an invite
-- is sent, before the invite is ever accepted (see admin-mentor-status).
-- A new student signing up in that window could land on a mentor who
-- hasn't even set a password yet and may never complete the invite at
-- all. auth.users.confirmed_at (set the moment they click the invite
-- link) is the real "actually onboarded" signal.
create or replace function auto_assign_mentor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_id uuid;
begin
  if new.role <> 'student' then
    return new;
  end if;

  select p.id into v_mentor_id
  from profiles p
  join auth.users au on au.id = p.id and au.confirmed_at is not null
  left join mentor_assignments ma on ma.mentor_id = p.id and ma.is_active
  where p.role = 'mentor' and p.status = 'active'
  group by p.id
  order by count(ma.id) asc, random()
  limit 1;

  -- No active, confirmed mentors yet — leave unassigned, same as today; an
  -- admin can assign one manually once a mentor account exists.
  if v_mentor_id is not null then
    insert into mentor_assignments (mentor_id, student_id, is_active)
    values (v_mentor_id, new.id, true);
  end if;

  return new;
end;
$$;
