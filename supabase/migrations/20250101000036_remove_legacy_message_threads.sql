-- Remove the pre-inbox chat history.
--
-- 20250101000032 moved each student's old 1:1 mentor chat into a single
-- question titled "Earlier messages with your mentor". Those threads are
-- being dropped to start the question inbox clean. Their messages go with
-- them (messages.ticket_id cascades). The match is narrow: that exact
-- subject, created by the migration as a general question with no week.
delete from tickets
where subject = 'Earlier messages with your mentor'
  and context_label = 'General question'
  and week_id is null
  and lesson_id is null;
