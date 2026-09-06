-- Assignments (5.3). `config` shape depends on `assignment_type`:
--   quiz: { "pass_threshold": 70 }
--   text: { "min_words": 150, "max_words": 800 }
--   url:  { "allowed_hosts": ["github.com"], "require_public": true }

create table assignments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  position int not null,
  title text not null,
  instructions text not null,
  assignment_type assignment_type not null,
  rubric text,
  config jsonb not null default '{}'::jsonb,
  status publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (week_id, position)
);

create index assignments_week_position_idx on assignments (week_id, position);

create trigger assignments_set_updated_at
  before update on assignments
  for each row
  execute function set_updated_at();

-- Quiz grading is deterministic and must be queryable, so questions/options
-- are real tables rather than jsonb inside `assignments.config`.
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  position int not null,
  prompt text not null,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (assignment_id, position)
);

create index quiz_questions_assignment_position_idx on quiz_questions (assignment_id, position);

create trigger quiz_questions_set_updated_at
  before update on quiz_questions
  for each row
  execute function set_updated_at();

create table quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions (id) on delete cascade,
  position int not null,
  text text not null,
  is_correct boolean not null default false, -- never exposed to students; see RLS (7)
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (question_id, position)
);

create index quiz_options_question_position_idx on quiz_options (question_id, position);

create trigger quiz_options_set_updated_at
  before update on quiz_options
  for each row
  execute function set_updated_at();
