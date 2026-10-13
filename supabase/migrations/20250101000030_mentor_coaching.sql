-- 1-on-1 coaching via each mentor's own free Cal.com page. Cal.com owns
-- booking, timezones, Meet links and notifications; the platform only needs
-- to know which page to embed for which mentor.

alter table profiles add column title text;
alter table profiles add column cal_link text;

-- A base profile link (cal.com/jane), not a single event (cal.com/jane/30min):
-- the profile page lists every public event type the mentor has, which is
-- how both "Career & Tech Coaching" and "Mock Interview Practice" show up.
alter table profiles add constraint profiles_cal_link_format
  check (cal_link is null or cal_link ~ '^https://cal\.com/[A-Za-z0-9][A-Za-z0-9._-]*$');

-- profiles_select only lets a student read their own row (it also holds
-- payment status, background, etc. for everyone else), so the coaching
-- page reads mentors through this instead: public fields only, and only
-- mentors who are actually bookable — active, invite accepted, link set.
-- Coaching is a paid-plan feature, so unpaid students get an empty list
-- (the page shows them an upgrade message instead). Cal.com pages are
-- themselves public, so this keeps the links out of unpaid students' reach
-- through the app rather than making them secret.
create or replace function list_coaching_mentors()
returns table (id uuid, full_name text, avatar_url text, title text, cal_link text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.title, p.cal_link
  from profiles p
  join auth.users au on au.id = p.id and au.confirmed_at is not null
  where p.role = 'mentor'
    and p.status = 'active'
    and p.cal_link is not null
    and (
      is_admin()
      or exists (
        select 1 from profiles me
        where me.id = auth.uid() and me.role = 'student' and me.payment_status = 'paid' and me.status = 'active'
      )
    )
  order by p.full_name;
$$;

revoke execute on function list_coaching_mentors() from public, anon;
grant execute on function list_coaching_mentors() to authenticated;
