-- Row-level security (7). RLS is enabled on every table; no table is
-- readable by `anon` except `certificates` by code. `current_user_role()`,
-- `is_admin()`, `is_mentor()` are defined in 20250101000002_profiles.sql as
-- SECURITY DEFINER functions, specifically so admin/mentor policies never
-- select from `profiles` inside a `profiles` policy (which would recurse).

create or replace function is_assigned_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from mentor_assignments
    where mentor_id = auth.uid()
      and student_id = p_student_id
      and is_active
  );
$$;

-- A week is visible to a student once it is published AND unlocked for them.
create or replace function has_week_unlock(p_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from week_unlocks
    where user_id = auth.uid() and week_id = p_week_id
  );
$$;

-- =========================================================================
-- profiles
-- =========================================================================
alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin() or is_assigned_student(id));

create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Students (and any non-admin) may update their own row, but never role/status.
-- Deliberately NOT security definer: this function's own `current_user`
-- check is how it tells a PostgREST-originated write (`anon`/`authenticated`)
-- apart from trusted direct DB access. Marking it security definer would
-- make `current_user` evaluate to the function's owner on every call,
-- silently disabling the guard for everyone.
create or replace function prevent_role_status_change_by_non_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Only guards writes coming through PostgREST as `anon`/`authenticated`.
  -- Direct database access (migrations, seeds, the `postgres` or
  -- `service_role` roles) is already a trusted, RLS-bypassing path.
  if current_user in ('anon', 'authenticated')
     and (new.role <> old.role or new.status <> old.status)
     and not is_admin() then
    raise exception 'only an admin may change role or status';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_status
  before update on profiles
  for each row
  execute function prevent_role_status_change_by_non_admin();

-- =========================================================================
-- tracks / weeks / lessons / resources / assignments
-- Not explicitly enumerated for students in the spec's RLS outline beyond
-- "weeks, lessons, resources, assignments"; `tracks` is extended the same
-- published-read policy since the app needs it to render enrollment info.
-- =========================================================================
alter table tracks enable row level security;
alter table weeks enable row level security;
alter table lessons enable row level security;
alter table resources enable row level security;
alter table assignments enable row level security;

-- `status = 'published'` alone is not enough to gate this: unlike the
-- weeks/lessons/resources/assignments policies below, nothing else here
-- implies auth.uid() is set, so an unqualified OR would leak published
-- tracks to `anon` too. The public marketing page instead reads track
-- titles through public_curriculum_overview().
create policy tracks_select on tracks for select
  using (is_admin() or (status = 'published' and auth.uid() is not null));
create policy tracks_admin_write on tracks for insert with check (is_admin());
create policy tracks_admin_update on tracks for update using (is_admin()) with check (is_admin());
create policy tracks_admin_delete on tracks for delete using (is_admin());

create policy weeks_select on weeks for select
  using (
    is_admin()
    or (status = 'published' and (is_mentor() or has_week_unlock(id)))
  );
create policy weeks_admin_write on weeks for insert with check (is_admin());
create policy weeks_admin_update on weeks for update using (is_admin()) with check (is_admin());
create policy weeks_admin_delete on weeks for delete using (is_admin());

create policy lessons_select on lessons for select
  using (
    is_admin()
    or (
      status = 'published'
      and (is_mentor() or has_week_unlock(week_id))
    )
  );
create policy lessons_admin_write on lessons for insert with check (is_admin());
create policy lessons_admin_update on lessons for update using (is_admin()) with check (is_admin());
create policy lessons_admin_delete on lessons for delete using (is_admin());

-- Resources carry no publish status of their own; visibility follows the
-- parent lesson's status and the student's unlock of its week.
create policy resources_select on resources for select
  using (
    is_admin()
    or exists (
      select 1 from lessons l
      where l.id = resources.lesson_id
        and l.status = 'published'
        and (is_mentor() or has_week_unlock(l.week_id))
    )
  );
create policy resources_admin_write on resources for insert with check (is_admin());
create policy resources_admin_update on resources for update using (is_admin()) with check (is_admin());
create policy resources_admin_delete on resources for delete using (is_admin());

create policy assignments_select on assignments for select
  using (
    is_admin()
    or (
      status = 'published'
      and (is_mentor() or has_week_unlock(week_id))
    )
  );
create policy assignments_admin_write on assignments for insert with check (is_admin());
create policy assignments_admin_update on assignments for update using (is_admin()) with check (is_admin());
create policy assignments_admin_delete on assignments for delete using (is_admin());

-- =========================================================================
-- quiz_questions: same unlock-gated read as assignments; no is_correct here.
-- quiz_options: NO select policy for anyone but admins. A student who could
-- read is_correct has the whole quiz, so answers are checked server-side
-- (submission evaluation edge function, service role) and students read
-- option text only through `quiz_options_for_student` below.
-- =========================================================================
alter table quiz_questions enable row level security;
alter table quiz_options enable row level security;

create policy quiz_questions_select on quiz_questions for select
  using (
    is_admin()
    or exists (
      select 1 from assignments a
      where a.id = quiz_questions.assignment_id
        and a.status = 'published'
        and (is_mentor() or has_week_unlock(a.week_id))
    )
  );
create policy quiz_questions_admin_write on quiz_questions for insert with check (is_admin());
create policy quiz_questions_admin_update on quiz_questions for update using (is_admin()) with check (is_admin());
create policy quiz_questions_admin_delete on quiz_questions for delete using (is_admin());

create policy quiz_options_admin_select on quiz_options for select using (is_admin());
create policy quiz_options_admin_write on quiz_options for insert with check (is_admin());
create policy quiz_options_admin_update on quiz_options for update using (is_admin()) with check (is_admin());
create policy quiz_options_admin_delete on quiz_options for delete using (is_admin());

-- View owned by the migration role (not security-invoker), so it runs with
-- the owner's privileges and can read `quiz_options` despite students
-- having no table-level select policy on it. The view itself embeds the
-- same unlock-gating and omits `is_correct` entirely.
create view quiz_options_for_student
with (security_invoker = false)
as
select o.id, o.question_id, o.position, o.text
from quiz_options o
join quiz_questions q on q.id = o.question_id
join assignments a on a.id = q.assignment_id
where a.status = 'published' and has_week_unlock(a.week_id);

grant select on quiz_options_for_student to authenticated;

-- =========================================================================
-- enrollments / lesson_progress / resource_progress / week_unlocks
-- =========================================================================
alter table enrollments enable row level security;
alter table lesson_progress enable row level security;
alter table resource_progress enable row level security;
alter table week_unlocks enable row level security;

create policy enrollments_select on enrollments for select
  using (user_id = auth.uid() or is_admin() or is_assigned_student(user_id));
create policy enrollments_insert on enrollments for insert
  with check (user_id = auth.uid() or is_admin());

create policy lesson_progress_select on lesson_progress for select
  using (user_id = auth.uid() or is_admin() or is_assigned_student(user_id));
create policy lesson_progress_insert on lesson_progress for insert
  with check (user_id = auth.uid());

create policy resource_progress_select on resource_progress for select
  using (user_id = auth.uid() or is_admin() or is_assigned_student(user_id));
create policy resource_progress_insert on resource_progress for insert
  with check (user_id = auth.uid());
create policy resource_progress_delete on resource_progress for delete
  using (user_id = auth.uid());

create policy week_unlocks_select on week_unlocks for select
  using (user_id = auth.uid() or is_admin() or is_assigned_student(user_id));
-- Admin manual unlock (PD-001 exception path); the `reason` NOT NULL check
-- for unlocked_by = 'admin' lives on the table itself.
create policy week_unlocks_admin_insert on week_unlocks for insert
  with check (is_admin() and unlocked_by = 'admin');

-- =========================================================================
-- submissions / quiz_answers / submission_events
-- =========================================================================
alter table submissions enable row level security;
alter table quiz_answers enable row level security;
alter table submission_events enable row level security;

create policy submissions_select on submissions for select
  using (user_id = auth.uid() or is_admin() or is_assigned_student(user_id));
create policy submissions_insert on submissions for insert
  with check (user_id = auth.uid());

-- Students may only ever touch flagged_for_review_at/flag_reason, and only
-- once (USING excludes rows that are already flagged). Mentor/admin status
-- overrides go through override_submission_status() below instead of a
-- direct UPDATE grant, because student, mentor and admin all share the
-- `authenticated` Postgres role — RLS filters rows, not columns, so a
-- column-level GRANT here would let a student write columns meant for
-- mentors on their own row.
create policy submissions_flag_update on submissions for update
  using (user_id = auth.uid() and flagged_for_review_at is null)
  with check (user_id = auth.uid());

revoke update on submissions from authenticated;
grant update (flagged_for_review_at, flag_reason) on submissions to authenticated;

create policy quiz_answers_select on quiz_answers for select
  using (
    exists (
      select 1 from submissions s
      where s.id = quiz_answers.submission_id
        and (s.user_id = auth.uid() or is_admin() or is_assigned_student(s.user_id))
    )
  );
create policy quiz_answers_insert on quiz_answers for insert
  with check (
    exists (
      select 1 from submissions s
      where s.id = quiz_answers.submission_id and s.user_id = auth.uid()
    )
  );

create policy submission_events_select on submission_events for select
  using (
    exists (
      select 1 from submissions s
      where s.id = submission_events.submission_id
        and (s.user_id = auth.uid() or is_admin() or is_assigned_student(s.user_id))
    )
  );
-- No insert/update/delete policy for anyone: rows are written exclusively
-- by SECURITY DEFINER functions and the service role, both of which bypass
-- RLS. Append-only, including for admins.

-- Records a student's one-time request for human review. Kept as an RPC
-- (rather than folding into the plain column-grant path above) so the
-- audit trail entry is written atomically with the flag.
create or replace function flag_submission_for_review(p_submission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_already_flagged boolean;
begin
  select user_id, flagged_for_review_at is not null into v_owner, v_already_flagged
    from submissions where id = p_submission_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not your submission';
  end if;
  if v_already_flagged then
    raise exception 'submission already flagged for review';
  end if;

  update submissions
    set flagged_for_review_at = now(), flag_reason = p_reason
    where id = p_submission_id;

  insert into submission_events (submission_id, actor_user_id, action, note)
    values (p_submission_id, auth.uid(), 'status_overridden', 'student requested review: ' || coalesce(p_reason, ''));
end;
$$;

-- Mentor (assigned student only) or admin override of a submission's
-- final status. The only write path for final_status/human_feedback once
-- a submission exists; always logs to submission_events (PD-002).
create or replace function override_submission_status(
  p_submission_id uuid,
  p_final_status submission_status,
  p_human_feedback text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_from_status text;
begin
  select user_id, final_status into v_owner, v_from_status
    from submissions where id = p_submission_id;

  if v_owner is null then
    raise exception 'submission not found';
  end if;
  if not (is_admin() or is_assigned_student(v_owner)) then
    raise exception 'not authorized to review this submission';
  end if;

  update submissions
    set final_status = p_final_status,
        human_feedback = p_human_feedback,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        evaluation_status = case when evaluation_status = 'failed' then 'needs_review' else evaluation_status end
    where id = p_submission_id;

  insert into submission_events (submission_id, actor_user_id, action, from_status, to_status, note)
    values (p_submission_id, auth.uid(), 'status_overridden', v_from_status, p_final_status::text, p_human_feedback);
end;
$$;

-- =========================================================================
-- mentor_assignments
-- =========================================================================
alter table mentor_assignments enable row level security;

create policy mentor_assignments_select on mentor_assignments for select
  using (mentor_id = auth.uid() or student_id = auth.uid() or is_admin());
create policy mentor_assignments_admin_write on mentor_assignments for insert with check (is_admin());
create policy mentor_assignments_admin_update on mentor_assignments for update using (is_admin()) with check (is_admin());
create policy mentor_assignments_admin_delete on mentor_assignments for delete using (is_admin());

-- =========================================================================
-- messages
-- =========================================================================
alter table messages enable row level security;

create policy messages_select on messages for select
  using (student_id = auth.uid() or is_assigned_student(student_id));
create policy messages_insert on messages for insert
  with check (
    sender_id = auth.uid()
    and (student_id = auth.uid() or is_assigned_student(student_id))
  );

-- =========================================================================
-- certificate_templates (admin only) / certificates (owner + public by code
-- via get_certificate_by_code(), defined after the table below)
-- =========================================================================
alter table certificate_templates enable row level security;
alter table certificates enable row level security;

create policy certificate_templates_admin_all on certificate_templates for all
  using (is_admin()) with check (is_admin());

create policy certificates_select_own on certificates for select
  using (user_id = auth.uid() or is_admin());

-- No anon SELECT policy on the table itself: `using (true)` would let an
-- anonymous client list every certificate ever issued (name, user_id,
-- snapshot included), not just look one up by its code. Public verification
-- instead goes through this SECURITY DEFINER function, which only ever
-- returns the single row matching the code the caller already has.
create or replace function get_certificate_by_code(p_code text)
returns table (
  code text,
  rendered_snapshot jsonb,
  issued_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.rendered_snapshot, c.issued_at
  from certificates c
  where c.code = p_code;
$$;

grant execute on function get_certificate_by_code(text) to anon, authenticated;

-- =========================================================================
-- email_log: service role only (writes come from edge functions); no
-- policy needed for authenticated users since nothing in the product reads
-- their own send history.
-- =========================================================================
alter table email_log enable row level security;

-- =========================================================================
-- Public marketing surface: the curriculum overview page is anon-visible,
-- but per this section no table is anon-readable. Expose only whitelisted,
-- published, week-level fields through a SECURITY DEFINER function instead
-- of a table grant.
-- =========================================================================
create or replace function public_curriculum_overview()
returns table (
  track_title text,
  week_position int,
  week_title text,
  week_goal text,
  week_summary text,
  estimated_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select t.title, w.position, w.title, w.goal, w.summary, w.estimated_hours
  from weeks w
  join tracks t on t.id = w.track_id
  where w.status = 'published' and t.status = 'published'
  order by w.position;
$$;

grant execute on function public_curriculum_overview() to anon, authenticated;
