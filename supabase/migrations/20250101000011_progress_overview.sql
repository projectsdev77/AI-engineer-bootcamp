-- Dashboard support (section 4, 6): week/overall progress percentages are
-- computed on read, never stored. Doing the aggregation in one
-- SECURITY DEFINER function -- rather than several client-side queries --
-- lets it report counts for locked weeks too (needed to size the overall
-- percentage against the whole track) without widening any RLS policy;
-- the function only ever returns the calling user's own progress.
create or replace function get_progress_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select track_id into v_track_id
    from enrollments
    where user_id = v_user_id
    order by enrolled_at desc
    limit 1;

  if v_track_id is null then
    return jsonb_build_object('enrolled', false);
  end if;

  select jsonb_build_object(
    'enrolled', true,
    'track_id', v_track_id,
    'overall', (
      select jsonb_build_object(
        'resources_completed', coalesce(count(*) filter (where rp.id is not null), 0),
        'resources_total', count(*)
      )
      from weeks w
      join lessons l on l.week_id = w.id and l.status = 'published'
      join resources r on r.lesson_id = l.id and r.is_required
      left join resource_progress rp on rp.resource_id = r.id and rp.user_id = v_user_id
      where w.track_id = v_track_id and w.status = 'published'
    ),
    'weeks', (
      select coalesce(jsonb_agg(week_row order by (week_row ->> 'position')::int), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'week_id', w.id,
          'position', w.position,
          'title', w.title,
          'goal', w.goal,
          'unlocked', exists(
            select 1 from week_unlocks wu where wu.user_id = v_user_id and wu.week_id = w.id
          ),
          'lessons_total', (
            select count(*) from lessons l where l.week_id = w.id and l.status = 'published'
          ),
          'lessons_completed', (
            select count(*)
            from lessons l
            join lesson_progress lp
              on lp.lesson_id = l.id and lp.user_id = v_user_id and lp.completed_at is not null
            where l.week_id = w.id and l.status = 'published'
          ),
          'assignments_total', (
            select count(*) from assignments a where a.week_id = w.id and a.status = 'published'
          ),
          'assignments_done', (
            select count(*)
            from assignments a
            where a.week_id = w.id
              and a.status = 'published'
              and exists (
                select 1 from submissions s
                where s.assignment_id = a.id
                  and s.user_id = v_user_id
                  and s.final_status <> 'pending'
                  and s.attempt_number = (
                    select max(s2.attempt_number)
                    from submissions s2
                    where s2.assignment_id = a.id and s2.user_id = v_user_id
                  )
              )
          )
        ) as week_row
        from weeks w
        where w.track_id = v_track_id and w.status = 'published'
      ) weeks_sub
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_progress_overview() to authenticated;
