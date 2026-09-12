-- 20250101000016 gave every FK a delete behavior that makes sense for
-- account deletion, but only covered FKs pointing directly at profiles(id)
-- — it missed messages.submission_id, which points at submissions(id) with
-- the implicit default (RESTRICT). A message linked to a specific
-- submission (a feature the schema supports, even though nothing in the
-- app sets this column yet) would block the whole account deletion the
-- moment that submission's row tries to cascade away with its owner,
-- exactly the failure mode 20250101000016 set out to eliminate everywhere
-- else. Null it out like every other "reference, not ownership" column.
alter table messages drop constraint messages_submission_id_fkey;
alter table messages add constraint messages_submission_id_fkey
  foreign key (submission_id) references submissions (id) on delete set null;
