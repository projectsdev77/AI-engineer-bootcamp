-- Mentors, messages, certificates, email log (5.6)

create table mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references profiles (id),
  student_id uuid not null references profiles (id),
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One active mentor per student, with reassignment history preserved.
create unique index mentor_assignments_one_active_per_student_idx
  on mentor_assignments (student_id) where is_active;

create index mentor_assignments_mentor_active_idx on mentor_assignments (mentor_id, is_active);

-- 1:1 thread between a student and their mentor. No `conversations` table:
-- the thread is implicitly every message sharing a `student_id`.
create table messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id),
  sender_id uuid not null references profiles (id),
  submission_id uuid references submissions (id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_student_created_idx on messages (student_id, created_at);

-- Admin-editable, structured fields only (PD-011): merge fields are
-- substituted into escaped text at render time, so admin input can never
-- become markup on the public certificate page.
-- Merge fields available in body_text: {{student_name}}, {{track_title}},
-- {{completion_date}}, {{certificate_code}}.
create table certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title_text text not null,
  body_text text not null,
  signature_name text,
  signature_title text,
  logo_url text,
  accent_color text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Exactly one active template.
create unique index certificate_templates_one_active_idx
  on certificate_templates (is_active) where is_active;

create trigger certificate_templates_set_updated_at
  before update on certificate_templates
  for each row
  execute function set_updated_at();

create or replace function generate_certificate_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- `rendered_snapshot` freezes the resolved field values at issue time, so a
-- later template edit never rewrites certificates already awarded.
create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  enrollment_id uuid not null references enrollments (id),
  template_id uuid not null references certificate_templates (id),
  code text not null unique default generate_certificate_code(),
  rendered_snapshot jsonb not null,
  issued_at timestamptz not null default now(),
  unique (enrollment_id)
);

-- Exists to prevent duplicate sends, nothing more.
create table email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  email_type email_type not null,
  sent_at timestamptz not null default now()
);

create index email_log_user_type_sent_idx on email_log (user_id, email_type, sent_at);
