-- Project submissions (client request): a GitHub repo + live demo + notes,
-- graded by the same AI / optional mentor-review flow, and shown in the
-- student's portfolio once passed.
--
-- On its own because a new enum value can't be used in the same
-- transaction that adds it; 20250101000035 builds on it.
alter type assignment_type add value if not exists 'project';
