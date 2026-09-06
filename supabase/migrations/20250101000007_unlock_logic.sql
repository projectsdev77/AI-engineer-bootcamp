-- Week unlock logic (PD-001): week N+1 unlocks when every published lesson
-- in week N is complete AND every published assignment in week N has a
-- submission whose most recent attempt's final_status is not 'pending'.

create or replace function week_is_complete_for_user(p_user_id uuid, p_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from lessons l
      where l.week_id = p_week_id
        and l.status = 'published'
        and not exists (
          select 1 from lesson_progress lp
          where lp.lesson_id = l.id
            and lp.user_id = p_user_id
            and lp.completed_at is not null
        )
    )
    and not exists (
      select 1
      from assignments a
      where a.week_id = p_week_id
        and a.status = 'published'
        and not exists (
          select 1
          from submissions s
          where s.assignment_id = a.id
            and s.user_id = p_user_id
            and s.final_status <> 'pending'
            and s.attempt_number = (
              select max(s2.attempt_number)
              from submissions s2
              where s2.assignment_id = a.id and s2.user_id = p_user_id
            )
        )
    );
$$;

-- Unlocks the next week for the user if `p_week_id` is now complete, and
-- marks the enrollment completed if `p_week_id` was the track's last week.
-- Never revokes an unlock: curriculum edits can only add work, not
-- retroactively lock a student out of content already reached.
create or replace function unlock_next_week_if_ready(p_user_id uuid, p_week_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track_id uuid;
  v_position int;
  v_next_week_id uuid;
  v_max_position int;
begin
  if not week_is_complete_for_user(p_user_id, p_week_id) then
    return;
  end if;

  select track_id, position into v_track_id, v_position from weeks where id = p_week_id;

  select id into v_next_week_id
    from weeks
    where track_id = v_track_id and position = v_position + 1;

  if v_next_week_id is not null then
    insert into week_unlocks (user_id, week_id, unlocked_by)
    values (p_user_id, v_next_week_id, 'system')
    on conflict (user_id, week_id) do nothing;
    return;
  end if;

  select max(position) into v_max_position from weeks where track_id = v_track_id;
  if v_position = v_max_position then
    update enrollments
      set status = 'completed', completed_at = coalesce(completed_at, now())
      where user_id = p_user_id and track_id = v_track_id and status = 'active';
  end if;
end;
$$;

create or replace function lesson_progress_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed_at is not null then
    perform unlock_next_week_if_ready(new.user_id, (select week_id from lessons where id = new.lesson_id));
  end if;
  return new;
end;
$$;

create trigger lesson_progress_after_insert_or_update
  after insert or update of completed_at on lesson_progress
  for each row
  execute function lesson_progress_after_change();

create or replace function submissions_after_final_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.final_status <> 'pending' then
    perform unlock_next_week_if_ready(new.user_id, (select week_id from assignments where id = new.assignment_id));
  end if;
  return new;
end;
$$;

create trigger submissions_after_insert_or_update
  after insert or update of final_status on submissions
  for each row
  execute function submissions_after_final_status_change();

-- Unlocks week 1 the moment a student is enrolled.
create or replace function enrollments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_week_id uuid;
begin
  select id into v_first_week_id
    from weeks
    where track_id = new.track_id
    order by position asc
    limit 1;

  if v_first_week_id is not null then
    insert into week_unlocks (user_id, week_id, unlocked_by)
    values (new.user_id, v_first_week_id, 'system')
    on conflict (user_id, week_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger enrollments_after_insert
  after insert on enrollments
  for each row
  execute function enrollments_after_insert();

-- Automatic enrollment into the single track on signup (V1 scope, A-003).
create or replace function auto_enroll_new_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student' then
    insert into enrollments (user_id, track_id)
    select new.id, t.id
      from tracks t
      order by t.created_at asc
      limit 1
    on conflict (user_id, track_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_profile_created_enroll
  after insert on profiles
  for each row
  execute function auto_enroll_new_student();
