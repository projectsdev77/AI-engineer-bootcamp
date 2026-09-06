-- Admin mentor assignment (PD-006 open question #2: manual assignment for
-- V1). Deactivating the old assignment and inserting the new one in a
-- single function call, rather than two separate client requests, avoids
-- a real race against the partial unique index on (student_id) where
-- is_active — two students-in-flight requests, or a client retry, could
-- otherwise both see "no active row" and both try to insert one.
create or replace function admin_reassign_mentor(p_student_id uuid, p_mentor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  update mentor_assignments
    set is_active = false
    where student_id = p_student_id and is_active;

  insert into mentor_assignments (mentor_id, student_id, is_active)
  values (p_mentor_id, p_student_id, true);
end;
$$;

grant execute on function admin_reassign_mentor(uuid, uuid) to authenticated;
