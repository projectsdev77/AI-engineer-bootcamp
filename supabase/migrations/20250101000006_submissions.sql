-- Submissions and feedback (5.5)

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  assignment_id uuid not null references assignments (id),
  attempt_number int not null,
  submitted_at timestamptz not null default now(),
  content text, -- free text for `text`, the URL for `url`, null for `quiz`
  quiz_score numeric(5, 2),
  evaluation_status eval_status not null default 'pending',
  ai_feedback text,
  ai_suggested_status submission_status,
  ai_model text,
  ai_error text,
  final_status submission_status not null default 'pending',
  flagged_for_review_at timestamptz,
  flag_reason text,
  human_feedback text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  assignment_version jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, assignment_id, attempt_number)
);

create index submissions_user_assignment_idx on submissions (user_id, assignment_id);
create index submissions_pending_review_idx on submissions (evaluation_status)
  where evaluation_status in ('pending', 'needs_review');

create trigger submissions_set_updated_at
  before update on submissions
  for each row
  execute function set_updated_at();

create table quiz_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  question_id uuid not null references quiz_questions (id),
  selected_option_id uuid not null references quiz_options (id),
  unique (submission_id, question_id)
);

-- Audit trail required by PD-002. Append-only: no update or delete policy
-- for anyone, including admins (enforced in RLS migration).
create table submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  actor_user_id uuid references profiles (id),
  action submission_action not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index submission_events_submission_idx on submission_events (submission_id, created_at);
