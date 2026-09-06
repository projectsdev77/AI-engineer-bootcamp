-- Any authenticated, enrolled student should see the full week roadmap
-- (title/goal/summary/position) so the dashboard can render locked weeks
-- with a lock icon instead of just stopping at "week N of ??". This is not
-- a new information leak: that same metadata is already public to `anon`
-- via public_curriculum_overview(). Only the roadmap changes here —
-- lessons, resources and assignments keep the original unlock-gated
-- policies from 20250101000009, since that's where the actual content is.
drop policy weeks_select on weeks;

create policy weeks_select on weeks for select
  using (is_admin() or (status = 'published' and auth.uid() is not null));
