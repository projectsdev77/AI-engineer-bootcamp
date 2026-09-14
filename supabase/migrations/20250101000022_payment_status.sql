-- One-time-payment, full-access model: week 1 stays free for every
-- student (the free trial the landing page already promises — "week one
-- is open", "no card required" needed no copy changes), weeks 2-12
-- require payment_status = 'paid'. Stripe isn't wired up yet — an admin
-- flips this by hand via admin_set_payment_status() until it is; the
-- gating logic below doesn't care how payment_status became 'paid', so
-- swapping in real Stripe webhooks later is a drop-in.
create type payment_status as enum ('unpaid', 'paid');

alter table profiles add column payment_status payment_status not null default 'unpaid';
alter table profiles add column paid_at timestamptz;
-- Manual bookkeeping until Stripe exists (e.g. "paid via bank transfer, ref #1234").
alter table profiles add column payment_note text;

-- Extend the existing role/status guard (20250101000009) to also protect
-- the new payment columns — a student must never be able to self-mark as
-- paid through a direct client update the same way they can't self-promote
-- to mentor/admin.
create or replace function prevent_role_status_change_by_non_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (
       new.role <> old.role
       or new.status <> old.status
       or new.payment_status <> old.payment_status
       or new.paid_at is distinct from old.paid_at
       or new.payment_note is distinct from old.payment_note
     )
     and not is_admin() then
    raise exception 'only an admin may change role, status, or payment fields';
  end if;
  return new;
end;
$$;

-- Every call into unlock_next_week_if_ready() unlocks week 2 or later
-- (week 1's own unlock is unconditional, via enrollments_after_insert
-- below — untouched) — so gate the insert on payment_status here and
-- nowhere else; week visibility already runs entirely off the presence
-- of a week_unlocks row, so no RLS policy needs to change.
create or replace function unlock_next_week_if_ready(p_user_id uuid, p_week_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track_id uuid;
  v_position int;
  v_next_week_id uuid;
  v_max_position int;
  v_payment_status payment_status;
begin
  if not week_is_complete_for_user(p_user_id, p_week_id) then
    return;
  end if;

  select track_id, position into v_track_id, v_position from weeks where id = p_week_id;

  select id into v_next_week_id
    from weeks
    where track_id = v_track_id and position = v_position + 1;

  if v_next_week_id is not null then
    select payment_status into v_payment_status from profiles where id = p_user_id;
    if v_payment_status = 'paid' then
      insert into week_unlocks (user_id, week_id, unlocked_by)
      values (p_user_id, v_next_week_id, 'system')
      on conflict (user_id, week_id) do nothing;
    end if;
    return;
  end if;

  select max(position) into v_max_position from weeks where track_id = v_track_id;
  if v_position = v_max_position then
    update enrollments
      set status = 'completed', completed_at = coalesce(completed_at, now())
      where user_id = p_user_id and track_id = v_track_id and status = 'active';
  end if;
end;
$$;

-- Re-runs the unlock check for every week a student already has, so
-- whichever next week was earned-but-blocked purely on payment unlocks
-- the moment payment_status flips to 'paid'. A student can never have
-- completed a week further ahead than one they haven't unlocked (weeks are
-- invisible until unlocked), so one pass over currently-unlocked weeks is
-- always enough — there's nothing beyond that single blocked step to
-- cascade through.
create or replace function catch_up_unlocks_after_payment(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_id uuid;
begin
  for v_week_id in
    select wu.week_id
    from week_unlocks wu
    join weeks w on w.id = wu.week_id
    where wu.user_id = p_user_id
    order by w.position asc
  loop
    perform unlock_next_week_if_ready(p_user_id, v_week_id);
  end loop;
end;
$$;

create or replace function admin_set_payment_status(p_student_id uuid, p_status payment_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  update profiles
    set payment_status = p_status,
        paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
        payment_note = p_note
    where id = p_student_id;

  if p_status = 'paid' then
    perform catch_up_unlocks_after_payment(p_student_id);
  end if;
end;
$$;

grant execute on function admin_set_payment_status(uuid, payment_status, text) to authenticated;
