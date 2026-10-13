-- Messages become tickets (client request): instead of one endless
-- student <-> assigned-mentor chat, a student opens a question ("ticket")
-- per topic. New tickets land in a shared queue any mentor can claim; only
-- the claiming mentor replies, and they close the ticket when it's solved.
-- A closed ticket stays readable but accepts no new messages.
--
-- Messages keep living in `messages`, now grouped by `ticket_id`. All
-- status changes go through the SECURITY DEFINER functions below — clients
-- get no insert/update/delete on `tickets` at all.

create type ticket_status as enum ('open', 'closed');

create table tickets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  week_id uuid references weeks (id) on delete set null,
  lesson_id uuid references lessons (id) on delete set null,
  -- Snapshot of "Week 3 · Lesson title" at creation, so the context still
  -- reads correctly after curriculum edits and without mentors needing
  -- curriculum joins.
  context_label text not null default 'General question',
  status ticket_status not null default 'open',
  -- A removed mentor's open tickets fall back into the shared queue.
  claimed_by uuid references profiles (id) on delete set null,
  claimed_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references profiles (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index tickets_student_idx on tickets (student_id, last_message_at desc);
create index tickets_queue_idx on tickets (created_at) where status = 'open' and claimed_by is null;
create index tickets_claimed_idx on tickets (claimed_by, status, last_message_at desc);

-- ---------------------------------------------------------------------------
-- messages: grouped by ticket, can carry attachments
-- ---------------------------------------------------------------------------
alter table messages add column ticket_id uuid references tickets (id) on delete cascade;
-- [{ "path": "<ticket id>/<file>", "name": "notes.py", "size": 1234, "type": "text/plain" }]
alter table messages add column attachments jsonb not null default '[]'::jsonb;

-- A mentor deleting their account used to cascade-delete every message they
-- sent (fine for a private 1:1 thread). In a ticket, those replies are part
-- of the student's history, so keep them with the sender nulled out.
alter table messages alter column sender_id drop not null;
alter table messages drop constraint messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references profiles (id) on delete set null;

-- Move each existing student thread into one ticket. Threads whose last
-- message came from the mentor were answered, so they start closed; ones
-- still waiting on a reply stay open with the mentor who was handling them.
with threads as (
  select
    m.student_id,
    min(m.created_at) as first_at,
    max(m.created_at) as last_at,
    (array_agg(m.sender_id order by m.created_at desc))[1] as last_sender,
    (array_agg(m.sender_id order by m.created_at desc) filter (where m.sender_id is distinct from m.student_id))[1] as last_mentor
  from messages m
  group by m.student_id
)
insert into tickets (student_id, subject, status, claimed_by, claimed_at, closed_at, last_message_at, created_at)
select
  t.student_id,
  'Earlier messages with your mentor',
  case when t.last_sender is distinct from t.student_id then 'closed'::ticket_status else 'open'::ticket_status end,
  coalesce(
    t.last_mentor,
    (select ma.mentor_id from mentor_assignments ma where ma.student_id = t.student_id and ma.is_active limit 1)
  ),
  t.first_at,
  case when t.last_sender is distinct from t.student_id then t.last_at end,
  t.last_at,
  t.first_at
from threads t;

update messages m set ticket_id = t.id from tickets t where t.student_id = m.student_id and m.ticket_id is null;

alter table messages alter column ticket_id set not null;
create index messages_ticket_created_idx on messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

-- Who may read a ticket: its student, the claiming mentor, admins, and any
-- mentor while it's still unclaimed (so they can decide whether to claim).
create or replace function can_view_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tickets t
    where t.id = p_ticket_id
      and (
        t.student_id = auth.uid()
        or t.claimed_by = auth.uid()
        or is_admin()
        or (is_mentor() and t.status = 'open' and t.claimed_by is null)
      )
  );
$$;

-- Who is in the conversation: the student and the claiming mentor.
create or replace function is_ticket_participant(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tickets t
    where t.id = p_ticket_id and (t.student_id = auth.uid() or t.claimed_by = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table tickets enable row level security;

create policy tickets_select on tickets for select using (can_view_ticket(id));

drop policy messages_select on messages;
drop policy messages_insert on messages;
drop policy messages_update_read on messages;

create policy messages_select on messages for select using (can_view_ticket(ticket_id));

-- Only the two participants post, and only while the ticket is open.
create policy messages_insert on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from tickets t
      where t.id = ticket_id
        and t.status = 'open'
        and t.student_id = messages.student_id
        and (t.student_id = auth.uid() or t.claimed_by = auth.uid())
    )
  );

-- Participants mark the other side's messages read. Column privileges
-- below limit this to read_at, so it can't be used to edit a message.
create policy messages_update_read on messages for update
  using (is_ticket_participant(ticket_id) and sender_id is distinct from auth.uid())
  with check (is_ticket_participant(ticket_id) and sender_id is distinct from auth.uid());

revoke update on messages from authenticated, anon;
grant update (read_at) on messages to authenticated;

-- Keep student_id consistent with the ticket, validate attachments, and
-- bump the ticket's activity time.
create or replace function messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket tickets%rowtype;
  v_item jsonb;
begin
  select * into v_ticket from tickets where id = new.ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;
  new.student_id := v_ticket.student_id;
  new.read_at := null;

  if jsonb_typeof(new.attachments) <> 'array' or jsonb_array_length(new.attachments) > 5 then
    raise exception 'Up to 5 attachments per message';
  end if;
  for v_item in select * from jsonb_array_elements(new.attachments) loop
    if (v_item ->> 'path') is null or (v_item ->> 'path') not like new.ticket_id::text || '/%' then
      raise exception 'Invalid attachment';
    end if;
  end loop;

  if char_length(btrim(new.body)) = 0 and jsonb_array_length(new.attachments) = 0 then
    raise exception 'Message is empty';
  end if;
  return new;
end;
$$;

create trigger messages_before_insert before insert on messages
  for each row execute function messages_before_insert();

create or replace function messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update tickets set last_message_at = new.created_at where id = new.ticket_id;
  return new;
end;
$$;

create trigger messages_after_insert after insert on messages
  for each row execute function messages_after_insert();

-- ---------------------------------------------------------------------------
-- Actions
-- ---------------------------------------------------------------------------

-- A student opens a ticket with its first message. The id comes from the
-- client so attachments can be uploaded into the ticket's folder first.
create or replace function create_ticket(
  p_id uuid,
  p_subject text,
  p_body text,
  p_week_id uuid default null,
  p_lesson_id uuid default null,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := 'General question';
  v_week_position int;
  v_week_title text;
  v_lesson_title text;
begin
  if current_user_role() is distinct from 'student' then
    raise exception 'Only students can open a question';
  end if;
  if char_length(btrim(coalesce(p_subject, ''))) = 0 then
    raise exception 'Add a subject';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Add a message';
  end if;

  if p_lesson_id is not null and p_week_id is null then
    raise exception 'Pick a week for that lesson';
  end if;

  if p_week_id is not null then
    select w.position, w.title into v_week_position, v_week_title
    from weeks w
    where w.id = p_week_id and w.status = 'published' and has_week_unlock(w.id);
    if not found then
      raise exception 'That week is not available';
    end if;
    v_label := 'Week ' || v_week_position || ' · ' || v_week_title;

    if p_lesson_id is not null then
      select l.title into v_lesson_title
      from lessons l
      where l.id = p_lesson_id and l.week_id = p_week_id and l.status = 'published';
      if not found then
        raise exception 'That lesson is not in this week';
      end if;
      v_label := 'Week ' || v_week_position || ' · ' || v_lesson_title;
    end if;
  end if;

  insert into tickets (id, student_id, subject, week_id, lesson_id, context_label)
  values (p_id, auth.uid(), btrim(p_subject), p_week_id, p_lesson_id, v_label);

  insert into messages (ticket_id, student_id, sender_id, body, attachments)
  values (p_id, auth.uid(), auth.uid(), btrim(p_body), coalesce(p_attachments, '[]'::jsonb));

  return p_id;
end;
$$;

create or replace function claim_ticket(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket tickets%rowtype;
  v_name text;
begin
  if not (is_mentor() or is_admin()) then
    raise exception 'Only mentors can claim questions';
  end if;

  -- Single conditional update: if two mentors click at once, one wins.
  update tickets
  set claimed_by = auth.uid(), claimed_at = now()
  where id = p_ticket_id and status = 'open' and claimed_by is null;
  if found then
    return;
  end if;

  select * into v_ticket from tickets where id = p_ticket_id;
  if not found then
    raise exception 'Question not found';
  elsif v_ticket.status = 'closed' then
    raise exception 'This question is already resolved';
  elsif v_ticket.claimed_by = auth.uid() then
    return;
  end if;
  select full_name into v_name from profiles where id = v_ticket.claimed_by;
  raise exception 'Already claimed by %', coalesce(v_name, 'another mentor');
end;
$$;

create or replace function close_ticket(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update tickets
  set status = 'closed', closed_at = now(), closed_by = auth.uid()
  where id = p_ticket_id
    and status = 'open'
    and (claimed_by = auth.uid() or is_admin());
  if not found then
    raise exception 'Only the mentor handling this question can resolve it';
  end if;
end;
$$;

-- Admin: hand an open ticket to another mentor, or back to the queue (null).
create or replace function reassign_ticket(p_ticket_id uuid, p_mentor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can reassign questions';
  end if;
  if p_mentor_id is not null and not exists (
    select 1 from profiles where id = p_mentor_id and role in ('mentor', 'admin') and status = 'active'
  ) then
    raise exception 'Pick an active mentor';
  end if;

  update tickets
  set claimed_by = p_mentor_id, claimed_at = case when p_mentor_id is null then null else now() end
  where id = p_ticket_id and status = 'open';
  if not found then
    raise exception 'Only open questions can be reassigned';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads that need names the caller's profiles RLS can't see (a student
-- can't read their mentor's profile row; a mentor can't read an
-- unassigned student's).
-- ---------------------------------------------------------------------------
create or replace function list_tickets(p_ticket_id uuid default null)
returns table (
  id uuid,
  student_id uuid,
  student_name text,
  student_avatar_url text,
  subject text,
  context_label text,
  status ticket_status,
  claimed_by uuid,
  claimed_by_name text,
  claimed_by_avatar_url text,
  claimed_by_title text,
  claimed_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz,
  unread_count int,
  is_my_student boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.student_id,
    s.full_name,
    s.avatar_url,
    t.subject,
    t.context_label,
    t.status,
    t.claimed_by,
    c.full_name,
    c.avatar_url,
    c.title,
    t.claimed_at,
    t.closed_at,
    t.last_message_at,
    t.created_at,
    case
      when t.student_id = auth.uid() or t.claimed_by = auth.uid() then (
        select count(*)::int from messages m
        where m.ticket_id = t.id and m.read_at is null and m.sender_id is distinct from auth.uid()
      )
      else 0
    end,
    is_assigned_student(t.student_id)
  from tickets t
  join profiles s on s.id = t.student_id
  left join profiles c on c.id = t.claimed_by
  where (p_ticket_id is null or t.id = p_ticket_id)
    and (
      t.student_id = auth.uid()
      or t.claimed_by = auth.uid()
      or is_admin()
      or (is_mentor() and t.status = 'open' and t.claimed_by is null)
    )
  order by t.last_message_at desc;
$$;

-- Nav badge: unread replies in the caller's own conversations, plus (for
-- mentors and admins) how many questions are waiting to be claimed.
create or replace function ticket_badge_counts()
returns table (unread int, unclaimed int)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::int from messages m
      join tickets t on t.id = m.ticket_id
      where (t.student_id = auth.uid() or t.claimed_by = auth.uid())
        and m.read_at is null
        and m.sender_id is distinct from auth.uid()
    ),
    case when is_mentor() or is_admin() then (
      select count(*)::int from tickets t where t.status = 'open' and t.claimed_by is null
    ) else 0 end;
$$;

-- Admin reassign picker.
create or replace function list_active_mentors()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name from profiles p
  where is_admin() and p.role = 'mentor' and p.status = 'active'
  order by p.full_name;
$$;

revoke execute on function can_view_ticket(uuid), is_ticket_participant(uuid),
  create_ticket(uuid, text, text, uuid, uuid, jsonb), claim_ticket(uuid), close_ticket(uuid),
  reassign_ticket(uuid, uuid), list_tickets(uuid), ticket_badge_counts(), list_active_mentors()
  from public, anon;
grant execute on function can_view_ticket(uuid), is_ticket_participant(uuid),
  create_ticket(uuid, text, text, uuid, uuid, jsonb), claim_ticket(uuid), close_ticket(uuid),
  reassign_ticket(uuid, uuid), list_tickets(uuid), ticket_badge_counts(), list_active_mentors()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Attachments (private Storage bucket). Files live at <ticket id>/<file>.
-- Readable by whoever can view the ticket. Uploadable by participants of an
-- open ticket — or, for a ticket being created (id not taken yet), by the
-- student creating it.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments', 'message-attachments', false, 10485760,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/json']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "message attachments: read" on storage.objects;
create policy "message attachments: read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and (
      exists (
        select 1 from tickets t
        where t.id::text = (storage.foldername(name))[1] and can_view_ticket(t.id)
      )
      or owner_id = auth.uid()::text
    )
  );

-- Runs as definer so it sees every ticket: under the caller's own RLS,
-- another student's ticket would look like a free id and the upload
-- would be let through.
create or replace function can_upload_ticket_attachment(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from tickets where id::text = p_folder) then exists (
      select 1 from tickets t
      where t.id::text = p_folder
        and t.status = 'open'
        and (t.student_id = auth.uid() or t.claimed_by = auth.uid())
    )
    else coalesce(current_user_role() = 'student', false)
  end;
$$;

revoke execute on function can_upload_ticket_attachment(text) from public, anon;
grant execute on function can_upload_ticket_attachment(text) to authenticated;

drop policy if exists "message attachments: upload" on storage.objects;
create policy "message attachments: upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and can_upload_ticket_attachment((storage.foldername(name))[1])
  );
