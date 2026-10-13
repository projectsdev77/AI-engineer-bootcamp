-- get_portfolio() returned every project's full instructions, including
-- projects in weeks the student hasn't unlocked (e.g. unpaid students).
-- The portfolio page never shows them, but they were readable from the
-- API response, bypassing the week-unlock rule that hides locked
-- assignments everywhere else. Same function, with instructions only for
-- unlocked weeks. Titles, week and skills stay visible for the greyed-out
-- cards, like the public curriculum page.

create or replace function get_portfolio(p_target_user_id uuid default null)
returns table (
  assignment_id uuid,
  title text,
  instructions text,
  week_id uuid,
  week_position int,
  week_title text,
  week_skills text[],
  state text,
  repo_url text,
  demo_url text,
  notes text,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_track_id uuid;
begin
  if p_target_user_id is null then
    v_user_id := auth.uid();
    if v_user_id is null then
      raise exception 'not authenticated';
    end if;
  else
    if not (is_admin() or is_assigned_student(p_target_user_id) or p_target_user_id = auth.uid()) then
      raise exception 'not authorized to view this user''s portfolio';
    end if;
    v_user_id := p_target_user_id;
  end if;

  select e.track_id into v_track_id
    from enrollments e
    where e.user_id = v_user_id
    order by e.enrolled_at desc
    limit 1;
  if v_track_id is null then
    return;
  end if;

  return query
  select
    a.id,
    a.title,
    -- Instructions are paid content: only for weeks the student has unlocked.
    case when exists (select 1 from week_unlocks wu where wu.user_id = v_user_id and wu.week_id = w.id)
      then a.instructions end,
    w.id,
    w.position,
    w.title,
    w.skills,
    case
      when passed.id is not null then 'completed'
      when latest.id is null then
        case when exists (select 1 from week_unlocks wu where wu.user_id = v_user_id and wu.week_id = w.id)
          then 'not_started' else 'locked' end
      when latest.final_status = 'needs_work' and latest.flagged_for_review_at is null then 'needs_work'
      else 'in_review'
    end,
    passed.repo_url,
    passed.demo_url,
    passed.content,
    coalesce(passed.reviewed_at, passed.submitted_at)
  from assignments a
  join weeks w on w.id = a.week_id
  left join lateral (
    select s.* from submissions s
    where s.assignment_id = a.id and s.user_id = v_user_id and s.final_status = 'passed'
    order by s.attempt_number desc
    limit 1
  ) passed on true
  left join lateral (
    select s.* from submissions s
    where s.assignment_id = a.id and s.user_id = v_user_id
    order by s.attempt_number desc
    limit 1
  ) latest on true
  where w.track_id = v_track_id
    and w.status = 'published'
    and a.status = 'published'
    and a.assignment_type = 'project'
  order by w.position, a.position;
end;
$$;

