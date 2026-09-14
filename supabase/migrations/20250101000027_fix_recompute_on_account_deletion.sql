-- Fixes "Database error deleting user" on any account that has resource
-- progress checked off.
--
-- resource_progress_after_change() fires on every resource_progress row
-- deleted and calls recompute_lesson_completion(), which does an UPSERT
-- into lesson_progress. Deleting a whole account cascades
-- profiles -> resource_progress (on delete cascade), so this same trigger
-- fires for a plain account deletion too — and at that point the account's
-- own profiles row is disappearing in the very same cascading delete, so
-- the upsert can try to write a lesson_progress row for a user_id that no
-- longer exists in profiles, violating lesson_progress's own FK the
-- instant it's inserted. GoTrue surfaces the resulting Postgres error only
-- as a generic "Database error deleting user".
--
-- Recomputing is meaningless anyway once the account is gone, so just skip
-- it when the profile no longer exists.
create or replace function recompute_lesson_completion(p_user_id uuid, p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required_total int;
  v_required_checked int;
  v_all_done boolean;
begin
  if not exists (select 1 from profiles where id = p_user_id) then
    return;
  end if;

  select count(*) into v_required_total
    from resources
    where lesson_id = p_lesson_id and is_required;

  select count(*) into v_required_checked
    from resources r
    join resource_progress rp on rp.resource_id = r.id and rp.user_id = p_user_id
    where r.lesson_id = p_lesson_id and r.is_required;

  v_all_done := v_required_total > 0 and v_required_checked = v_required_total;

  insert into lesson_progress (user_id, lesson_id, completed_at)
  values (p_user_id, p_lesson_id, case when v_all_done then now() else null end)
  on conflict (user_id, lesson_id) do update
    set completed_at = case
      when v_all_done then coalesce(lesson_progress.completed_at, now())
      else null
    end;
end;
$$;
