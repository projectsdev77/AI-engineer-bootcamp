-- Curriculum: tracks -> weeks -> lessons -> resources (5.2)

create table tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  status publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger tracks_set_updated_at
  before update on tracks
  for each row
  execute function set_updated_at();

create table weeks (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks (id) on delete cascade,
  position int not null,
  title text not null,
  goal text,
  summary text,
  estimated_hours numeric(4, 1),
  status publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (track_id, position)
);

create index weeks_track_position_idx on weeks (track_id, position);

create trigger weeks_set_updated_at
  before update on weeks
  for each row
  execute function set_updated_at();

create table lessons (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  position int not null,
  title text not null,
  slug text not null,
  body text,
  estimated_minutes int,
  status publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (week_id, position),
  unique (week_id, slug)
);

create index lessons_week_position_idx on lessons (week_id, position);

create trigger lessons_set_updated_at
  before update on lessons
  for each row
  execute function set_updated_at();

create table resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  position int not null,
  title text not null,
  url text not null,
  resource_type resource_type not null default 'other',
  source_name text,
  estimated_minutes int,
  is_required boolean not null default true,
  last_checked_at timestamptz,
  last_status_code int,
  is_broken boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (lesson_id, position)
);

create index resources_lesson_position_idx on resources (lesson_id, position);
create index resources_is_broken_idx on resources (is_broken) where is_broken;

create trigger resources_set_updated_at
  before update on resources
  for each row
  execute function set_updated_at();
