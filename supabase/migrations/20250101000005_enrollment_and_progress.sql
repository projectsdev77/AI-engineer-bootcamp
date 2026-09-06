-- Enrollment and progress (5.4)

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  track_id uuid not null references tracks (id) on delete cascade,
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, track_id)
);

create trigger enrollments_set_updated_at
  before update on enrollments
  for each row
  execute function set_updated_at();

-- Row exists = started; `completed_at` set = complete. Set by trigger, not
-- directly by the student, per PD-007 (auto-complete on all-required-checked).
create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create index lesson_progress_user_completed_idx on lesson_progress (user_id, completed_at);

-- The per-item checklist state (PD-007). Presence of a row means checked;
-- unchecking deletes the row rather than nulling a timestamp.
create table resource_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  resource_id uuid not null references resources (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index resource_progress_user_resource_idx on resource_progress (user_id, resource_id);

-- Persisted rather than derived (PD-001): curriculum edits must never
-- retroactively lock a student out of content already reached.
create table week_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  week_id uuid not null references weeks (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unlocked_by unlock_source not null,
  unlocked_by_user_id uuid references profiles (id),
  reason text,
  unique (user_id, week_id)
);

alter table week_unlocks
  add constraint week_unlocks_admin_reason_required
  check (unlocked_by <> 'admin' or reason is not null);

-- Recomputes PD-007 lesson completion for one (user, lesson): every
-- `is_required` resource checked -> lesson_progress.completed_at set;
-- otherwise cleared. Upserts the lesson_progress row so a lesson can be
-- "started" implicitly by checking its first resource.
create or replace function recompute_lesson_completion(p_user_id uuid, p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required_total int;
  v_required_checked int;
  v_all_done boolean;
begin
  select count(*) into v_required_total
    from resources
    where lesson_id = p_lesson_id and is_required;

  select count(*) into v_required_checked
    from resources r
    join resource_progress rp on rp.resource_id = r.id and rp.user_id = p_user_id
    where r.lesson_id = p_lesson_id and r.is_required;

  v_all_done := v_required_total > 0 and v_required_checked = v_required_total;

  insert into lesson_progress (user_id, lesson_id, completed_at)
  values (p_user_id, p_lesson_id, case when v_all_done then now() else null end)
  on conflict (user_id, lesson_id) do update
    set completed_at = case
      when v_all_done then coalesce(lesson_progress.completed_at, now())
      else null
    end;
end;
$$;

create or replace function resource_progress_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform recompute_lesson_completion(new.user_id, (select lesson_id from resources where id = new.resource_id));
    return new;
  else
    perform recompute_lesson_completion(old.user_id, (select lesson_id from resources where id = old.resource_id));
    return old;
  end if;
end;
$$;

create trigger resource_progress_after_insert
  after insert on resource_progress
  for each row
  execute function resource_progress_after_change();

create trigger resource_progress_after_delete
  after delete on resource_progress
  for each row
  execute function resource_progress_after_change();

-- Manual complete button for lessons with zero resources (PD-007).
create or replace function mark_lesson_complete(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into v_resource_count from resources where lesson_id = p_lesson_id;
  if v_resource_count > 0 then
    raise exception 'lesson has resources; complete it by checking them off';
  end if;

  insert into lesson_progress (user_id, lesson_id, completed_at)
  values (auth.uid(), p_lesson_id, now())
  on conflict (user_id, lesson_id) do update
    set completed_at = coalesce(lesson_progress.completed_at, now());
end;
$$;
