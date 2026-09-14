-- messages.read_at has existed since the original schema but nothing ever
-- wrote to it (no UPDATE policy even existed for messages) or read it —
-- there was no unread-message indicator anywhere for either side of a
-- mentor/student thread. Lets either party in a thread mark messages read,
-- same scoping as the existing select policy.
create policy messages_update_read on messages for update
  using (student_id = auth.uid() or is_assigned_student(student_id))
  with check (student_id = auth.uid() or is_assigned_student(student_id));
