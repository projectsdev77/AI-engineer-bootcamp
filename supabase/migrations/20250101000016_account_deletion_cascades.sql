-- Self-service account deletion support.
--
-- Every FK below pointed at profiles(id) with the implicit default action
-- (RESTRICT), so deleting a profile — which is what happens when
-- auth.users is deleted, via profiles' own `on delete cascade` — would
-- fail with a foreign-key violation for any account that had ever
-- submitted an assignment, messaged a mentor, been assigned one, etc.
-- This migration gives each FK the behavior that actually makes sense
-- for "a person deletes their account":
--   - data the account OWNS (their submissions, messages, mentor links)
--     cascades away with it;
--   - references to the account as a REVIEWER/ACTOR on someone else's
--     data are nulled out instead, so that other person's records and
--     the append-only audit trail (PD-002) survive intact;
--   - certificates are decoupled entirely (nulled, not cascaded) because
--     rendered_snapshot is already a self-contained, escaped copy of
--     everything the public verification page needs — a certificate
--     must stay verifiable even after the earner deletes their account.

-- submissions: the student's own row cascades; the reviewing mentor/admin
-- reference is nulled so the student's submission and its audit trail
-- survive the reviewer's account being deleted.
alter table submissions drop constraint submissions_user_id_fkey;
alter table submissions add constraint submissions_user_id_fkey
  foreign key (user_id) references profiles (id) on delete cascade;

alter table submissions drop constraint submissions_reviewed_by_fkey;
alter table submissions add constraint submissions_reviewed_by_fkey
  foreign key (reviewed_by) references profiles (id) on delete set null;

-- submission_events: append-only audit trail (PD-002) must never
-- disappear just because the actor's account later goes away.
alter table submission_events drop constraint submission_events_actor_user_id_fkey;
alter table submission_events add constraint submission_events_actor_user_id_fkey
  foreign key (actor_user_id) references profiles (id) on delete set null;

-- week_unlocks: the unlocked-for student's row already cascades; the
-- admin who performed the unlock is a reference, not ownership.
alter table week_unlocks drop constraint week_unlocks_unlocked_by_user_id_fkey;
alter table week_unlocks add constraint week_unlocks_unlocked_by_user_id_fkey
  foreign key (unlocked_by_user_id) references profiles (id) on delete set null;

-- mentor_assignments: the link row itself is owned by both sides equally;
-- either side deleting their account should remove the link.
alter table mentor_assignments drop constraint mentor_assignments_mentor_id_fkey;
alter table mentor_assignments add constraint mentor_assignments_mentor_id_fkey
  foreign key (mentor_id) references profiles (id) on delete cascade;

alter table mentor_assignments drop constraint mentor_assignments_student_id_fkey;
alter table mentor_assignments add constraint mentor_assignments_student_id_fkey
  foreign key (student_id) references profiles (id) on delete cascade;

-- messages: a 1:1 thread keyed by student_id already disappears with the
-- student; a mentor deleting their account also takes the messages they
-- personally sent (in whichever threads) with them.
alter table messages drop constraint messages_student_id_fkey;
alter table messages add constraint messages_student_id_fkey
  foreign key (student_id) references profiles (id) on delete cascade;

alter table messages drop constraint messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references profiles (id) on delete cascade;

-- certificates: decouple from the account and the enrollment entirely so
-- an issued certificate stays publicly verifiable forever. Both columns
-- must become nullable for `on delete set null` to be legal.
alter table certificates alter column user_id drop not null;
alter table certificates drop constraint certificates_user_id_fkey;
alter table certificates add constraint certificates_user_id_fkey
  foreign key (user_id) references profiles (id) on delete set null;

alter table certificates alter column enrollment_id drop not null;
alter table certificates drop constraint certificates_enrollment_id_fkey;
alter table certificates add constraint certificates_enrollment_id_fkey
  foreign key (enrollment_id) references enrollments (id) on delete set null;

-- email_log: pure send-dedup log, no reason to survive the account.
alter table email_log drop constraint email_log_user_id_fkey;
alter table email_log add constraint email_log_user_id_fkey
  foreign key (user_id) references profiles (id) on delete cascade;
