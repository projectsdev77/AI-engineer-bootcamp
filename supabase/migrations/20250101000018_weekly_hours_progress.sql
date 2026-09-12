-- Gives the `weekly_hours_target` a student sets in Settings something to
-- compare against: minutes actually logged this calendar week, derived from
-- resource_progress timestamps against each resource's estimated_minutes
-- (assignments have no duration estimate, so they aren't counted — this is
-- an approximation of study time, not a stopwatch). Same self-or-assigned-
-- mentor-or-admin authorization pattern as get_progress_overview.
create or replace function get_weekly_hours_progress(p_target_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_week_start timestamptz;
  v_target_hours numeric;
  v_logged_minutes numeric;
begin
  if p_target_user_id is null then
    v_user_id := auth.uid();
    if v_user_id is null then
      raise exception 'not authenticated';
    end if;
  else
    if not (is_admin() or is_assigned_student(p_target_user_id)) then
      raise exception 'not authorized to view this user''s progress';
    end if;
    v_user_id := p_target_user_id;
  end if;

  v_week_start := date_trunc('week', now());

  select weekly_hours_target into v_target_hours from profiles where id = v_user_id;

  select coalesce(sum(r.estimated_minutes), 0) into v_logged_minutes
    from resource_progress rp
    join resources r on r.id = rp.resource_id
    where rp.user_id = v_user_id and rp.completed_at >= v_week_start;

  return jsonb_build_object(
    'target_hours', v_target_hours,
    'logged_minutes', v_logged_minutes,
    'week_start', v_week_start
  );
end;
$$;

grant execute on function get_weekly_hours_progress(uuid) to authenticated;
