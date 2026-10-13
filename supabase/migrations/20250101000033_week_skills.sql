-- Skill-by-skill progress (client request).
--
-- Admins tag each week with the skills it teaches ("Python", "Vector
-- Databases"). A student masters a week's skills by passing the week:
-- every published lesson completed and every published assignment with a
-- passed submission. Mastery is derived from that progress on read rather
-- than stored, so it can never drift out of sync — and a skill added to a
-- week a student already passed counts for them straight away.
--
-- A skill tagged on several weeks is mastered once all of them are passed;
-- until then the student sees partial progress (e.g. 2 of 4 weeks).

alter table weeks add column skills text[] not null default '{}';

-- CHECK constraints can't hold subqueries, hence the helper.
create or replace function week_skills_are_valid(p_skills text[])
returns boolean
language sql
immutable
as $$
  select cardinality(p_skills) <= 12
    and array_position(p_skills, null) is null
    and not exists (select 1 from unnest(p_skills) s where char_length(btrim(s)) not between 1 and 40);
$$;

alter table weeks add constraint weeks_skills_valid check (week_skills_are_valid(skills));

-- Stricter than week_is_complete_for_user (which only gates unlocking and
-- accepts a needs_work attempt): mastery needs a pass on every assignment.
-- A week with no published lessons or assignments can't be mastered.
create or replace function week_is_mastered_for_user(p_user_id uuid, p_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from lessons l where l.week_id = p_week_id and l.status = 'published'
      union all
      select 1 from assignments a where a.week_id = p_week_id and a.status = 'published'
    )
    and not exists (
      select 1 from lessons l
      where l.week_id = p_week_id
        and l.status = 'published'
        and not exists (
          select 1 from lesson_progress lp
          where lp.lesson_id = l.id and lp.user_id = p_user_id and lp.completed_at is not null
        )
    )
    and not exists (
      select 1 from assignments a
      where a.week_id = p_week_id
        and a.status = 'published'
        and not exists (
          select 1 from submissions s
          where s.assignment_id = a.id and s.user_id = p_user_id and s.final_status = 'passed'
        )
    );
$$;

revoke execute on function week_is_mastered_for_user(uuid, uuid) from public, anon;
grant execute on function week_is_mastered_for_user(uuid, uuid) to authenticated;

-- Per-skill rollup across the student's track. Skills are matched
-- case-insensitively ("python" and "Python" are one skill), shown with the
-- spelling used on the earliest week.
create or replace function get_skill_progress(p_target_user_id uuid default null)
returns table (
  skill text,
  weeks_total int,
  weeks_mastered int,
  mastered boolean,
  week_positions int[],
  mastered_week_positions int[]
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
      raise exception 'not authorized to view this user''s progress';
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
  with tagged as (
    select
      btrim(s.name) as name,
      lower(btrim(s.name)) as skill_key,
      w.position,
      week_is_mastered_for_user(v_user_id, w.id) as week_mastered
    from weeks w
    cross join lateral unnest(w.skills) as s(name)
    where w.track_id = v_track_id and w.status = 'published'
  )
  select
    (array_agg(t.name order by t.position))[1],
    count(distinct t.position)::int,
    count(distinct t.position) filter (where t.week_mastered)::int,
    bool_and(t.week_mastered),
    array_agg(distinct t.position order by t.position),
    coalesce(array_agg(distinct t.position order by t.position) filter (where t.week_mastered), '{}')
  from tagged t
  group by t.skill_key
  order by min(t.position), 1;
end;
$$;

revoke execute on function get_skill_progress(uuid) from public, anon;
grant execute on function get_skill_progress(uuid) to authenticated;

-- Same as 20250101000023, plus each week's skills and mastered flag.
create or replace function get_progress_overview(p_target_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_track_id uuid;
  v_result jsonb;
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
    'payment_status', (select payment_status from profiles where id = v_user_id),
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
          'skills', to_jsonb(w.skills),
          'mastered', week_is_mastered_for_user(v_user_id, w.id),
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
