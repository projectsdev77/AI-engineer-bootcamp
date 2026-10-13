-- Project submissions + portfolio (see 20250101000034).
--
-- A project submission stores the repo and demo links in their own
-- columns and the student's notes in `content` (same column text
-- submissions use). Assignment config: { "require_demo": boolean } —
-- defaults to required; admins can turn it off for projects with nothing
-- to deploy (a notebook, a CLI).

alter table submissions add column repo_url text;
alter table submissions add column demo_url text;

-- ---------------------------------------------------------------------------
-- Insert guard. The insert policy only checked who and how often, so a
-- student could insert a row already marked final_status = 'passed' (or
-- with their own "AI feedback") and skip grading — unlocking the next week,
-- mastering skills and, now, filling their portfolio. Grading fields are
-- written only by evaluate-submission (service role) and mentor/admin
-- overrides, never on a student insert.
-- ---------------------------------------------------------------------------
-- The assignment's type/config, regardless of whether the caller's RLS can
-- see it (the insert guard below must validate every project submission).
create or replace function assignment_type_and_config(p_assignment_id uuid, out assignment_type assignment_type, out config jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select a.assignment_type, a.config from assignments a where a.id = p_assignment_id;
$$;

revoke execute on function assignment_type_and_config(uuid) from public, anon;
grant execute on function assignment_type_and_config(uuid) to authenticated;

-- Deliberately SECURITY INVOKER: `current_user` must be the caller's role
-- (inside a definer function it would always be the owner).
create or replace function submissions_before_insert_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_type assignment_type;
  v_config jsonb;
begin
  if current_user in ('authenticated', 'anon') then
    new.evaluation_status := 'pending';
    new.final_status := 'pending';
    new.quiz_score := null;
    new.ai_feedback := null;
    new.ai_suggested_status := null;
    new.ai_model := null;
    new.ai_error := null;
    new.flagged_for_review_at := null;
    new.flag_reason := null;
    new.human_feedback := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.submitted_at := now();
  end if;

  select t.assignment_type, t.config into v_type, v_config from assignment_type_and_config(new.assignment_id) t;

  if v_type = 'project' then
    new.repo_url := nullif(btrim(coalesce(new.repo_url, '')), '');
    new.demo_url := nullif(btrim(coalesce(new.demo_url, '')), '');
    new.content := nullif(btrim(coalesce(new.content, '')), '');
    if new.repo_url is null or new.repo_url !~* '^https://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$' then
      raise exception 'Enter the GitHub repository link, like https://github.com/you/project';
    end if;
    if new.demo_url is not null and new.demo_url !~* '^https?://[^\s/$.?#][^\s]*$' then
      raise exception 'The live demo link must be a full URL starting with https://';
    end if;
    if new.demo_url is null and coalesce((v_config ->> 'require_demo')::boolean, true) then
      raise exception 'Add the live demo link';
    end if;
    if char_length(coalesce(new.content, '')) > 2000 then
      raise exception 'Keep the description under 2000 characters';
    end if;
  else
    new.repo_url := null;
    new.demo_url := null;
  end if;

  return new;
end;
$$;

create trigger submissions_before_insert_guard
  before insert on submissions
  for each row execute function submissions_before_insert_guard();

-- ---------------------------------------------------------------------------
-- Portfolio: every published project in the student's track, with its
-- state for that student. Submission links/notes are returned only once a
-- project is completed (passed) — the gallery's "full color" state.
-- ---------------------------------------------------------------------------
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
    a.instructions,
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

revoke execute on function get_portfolio(uuid) from public, anon;
grant execute on function get_portfolio(uuid) to authenticated;
