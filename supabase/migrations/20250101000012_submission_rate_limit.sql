-- PD-008: one submission per assignment per 60 seconds, enforced at the
-- database layer (not just client-side) so it holds regardless of which
-- client or retry path is doing the inserting.
drop policy submissions_insert on submissions;

create policy submissions_insert on submissions for insert
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from submissions s2
      where s2.user_id = auth.uid()
        and s2.assignment_id = submissions.assignment_id
        and s2.submitted_at > now() - interval '60 seconds'
    )
  );
