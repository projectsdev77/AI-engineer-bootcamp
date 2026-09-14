-- Auto-assigns every new student to a mentor at signup, so nobody sits
-- unassigned waiting on an admin (PD-006 originally scoped this to manual-
-- only for V1 — see 20250101000014). "Most fair" here means least-loaded:
-- whichever active mentor currently has the fewest active students, with a
-- random tiebreak so ties don't always land on the same mentor (e.g. every
-- mentor sitting at 0 assignments early on).
--
-- admin_reassign_mentor() (20250101000014) is untouched — an admin can
-- still move a student to a different mentor at any time; this only picks
-- the starting assignment.
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
  left join mentor_assignments ma on ma.mentor_id = p.id and ma.is_active
  where p.role = 'mentor' and p.status = 'active'
  group by p.id
  order by count(ma.id) asc, random()
  limit 1;

  -- No active mentors yet — leave unassigned, same as today; an admin can
  -- assign one manually once a mentor account exists.
  if v_mentor_id is not null then
    insert into mentor_assignments (mentor_id, student_id, is_active)
    values (v_mentor_id, new.id, true);
  end if;

  return new;
end;
$$;

create trigger profiles_auto_assign_mentor
  after insert on profiles
  for each row
  execute function auto_assign_mentor();
