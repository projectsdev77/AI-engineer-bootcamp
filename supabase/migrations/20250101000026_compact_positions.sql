-- One-time cleanup for gaps a prior delete left behind (e.g. deleting
-- "week 4" left position 4 permanently empty, since new rows were always
-- appended after the current max position rather than filling gaps).
-- Going forward this can't recur: the admin app now closes the gap itself
-- whenever a week/lesson/resource/assignment/quiz question/quiz option is
-- deleted (see useAdminCollection.remove()).
--
-- Renumbers every one of these `(parent, position)`-scoped tables to a
-- dense 1..N sequence per parent, preserving each row's existing relative
-- order. Two phases per table because unique(parent, position) is an
-- immediate (non-deferred) constraint, and a single bulk UPDATE's per-row
-- processing order isn't guaranteed — pushing everything out of range
-- first guarantees phase two can never collide, regardless of order.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('weeks', 'track_id'),
      ('lessons', 'week_id'),
      ('resources', 'lesson_id'),
      ('assignments', 'week_id'),
      ('quiz_questions', 'assignment_id'),
      ('quiz_options', 'question_id')
    ) as tables(table_name, parent_column)
  loop
    execute format('update %I set position = position + 1000000', t.table_name);

    execute format(
      'with renumbered as (
         select id, row_number() over (partition by %I order by position) as new_position
         from %I
       )
       update %I
       set position = renumbered.new_position
       from renumbered
       where %I.id = renumbered.id',
      t.parent_column, t.table_name, t.table_name, t.table_name
    );
  end loop;
end $$;
