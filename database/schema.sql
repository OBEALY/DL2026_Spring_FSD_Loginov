create extension if not exists "pgcrypto";

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  hint text,
  type text not null check (type in ('landmark', 'city', 'country')),
  latitude double precision not null,
  longitude double precision not null,
  region text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  theme text not null default 'iconic-landmarks',
  fact text not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table questions
  add column if not exists theme text not null default 'iconic-landmarks';

create table if not exists game_sessions (
  id uuid primary key,
  player_name text not null,
  mode text not null default 'classic' check (mode in ('classic')),
  theme_id text not null default 'all',
  question_queue jsonb not null,
  current_index integer not null default 0 check (current_index >= 0),
  total_questions integer not null check (total_questions > 0),
  total_score integer not null default 0 check (total_score >= 0),
  status text not null default 'active' check (status in ('active', 'finished')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table game_sessions
  add column if not exists theme_id text not null default 'all';

create table if not exists answers (
  id uuid primary key,
  session_id uuid not null references game_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  guess_latitude double precision not null,
  guess_longitude double precision not null,
  distance_km double precision not null,
  score integer not null check (score >= 0),
  response_time_ms integer,
  answered_at timestamptz not null default now()
);

create table if not exists question_suggestions (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  prompt text not null,
  location_name text not null,
  theme_id text not null,
  notes text,
  source_url text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_active on questions (is_active);
create index if not exists idx_questions_theme on questions (theme);
create index if not exists idx_sessions_status_score on game_sessions (status, total_score desc);
create index if not exists idx_answers_session on answers (session_id);
create index if not exists idx_question_suggestions_status on question_suggestions (status, created_at desc);

create or replace view leaderboard as
select
  gs.id as session_id,
  gs.player_name,
  gs.total_score,
  gs.finished_at,
  count(a.id)::int as answered_questions
from game_sessions gs
left join answers a on a.session_id = gs.id
where gs.status = 'finished'
group by gs.id, gs.player_name, gs.total_score, gs.finished_at;
