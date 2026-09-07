-- Admin's role was narrowed to content management + broken-link
-- monitoring; evaluating student submissions (pass/needs-work verdicts,
-- the exception queue) is mentor-only from here on. Admin retains
-- read-only visibility into a student's submission history elsewhere
-- (StudentAdminDetailPage) — that's oversight, not evaluation, so
-- submissions_select is untouched. This migration only removes admin's
-- ability to WRITE a verdict via override_submission_status.
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
  if not is_assigned_student(v_owner) then
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
