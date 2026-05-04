
-- ENUMS
do $$ begin
  create type question_topic as enum ('regulations','airspace','sectional','weather','performance','operations','adm','emergencies','remote_id','maintenance');
exception when duplicate_object then null; end $$;

-- QUESTIONS (public read for auth users)
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic question_topic not null,
  acs_code text not null,
  difficulty text not null default 'medium',
  source text not null,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null,
  common_mistake text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create policy "questions readable by authenticated" on public.questions
  for select to authenticated using (true);

-- QUIZ ATTEMPTS
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'practice',
  topic question_topic,
  total int not null default 0,
  correct int not null default 0,
  score numeric(5,2) not null default 0,
  duration_sec int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.quiz_attempts enable row level security;
create policy "own quiz_attempts select" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "own quiz_attempts insert" on public.quiz_attempts for insert with check (auth.uid() = user_id);
create policy "own quiz_attempts update" on public.quiz_attempts for update using (auth.uid() = user_id);

-- QUIZ ANSWERS
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_index int not null,
  is_correct boolean not null,
  time_ms int,
  created_at timestamptz not null default now()
);
alter table public.quiz_answers enable row level security;
create policy "own quiz_answers select" on public.quiz_answers for select using (auth.uid() = user_id);
create policy "own quiz_answers insert" on public.quiz_answers for insert with check (auth.uid() = user_id);
create index quiz_answers_user_idx on public.quiz_answers(user_id, created_at desc);

-- FLASHCARDS (SR)
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  front text not null,
  back text not null,
  topic question_topic,
  ease numeric(4,2) not null default 2.50,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_date date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.flashcards enable row level security;
create policy "own flashcards select" on public.flashcards for select using (auth.uid() = user_id);
create policy "own flashcards insert" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "own flashcards update" on public.flashcards for update using (auth.uid() = user_id);
create policy "own flashcards delete" on public.flashcards for delete using (auth.uid() = user_id);
create index flashcards_due_idx on public.flashcards(user_id, due_date);

-- LESSON COMPLETIONS
create table public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_slug text not null,
  topic question_topic,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_slug)
);
alter table public.lesson_completions enable row level security;
create policy "own lesson_completions select" on public.lesson_completions for select using (auth.uid() = user_id);
create policy "own lesson_completions insert" on public.lesson_completions for insert with check (auth.uid() = user_id);

-- EXAM SIMULATIONS
create table public.exam_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total int not null default 60,
  correct int not null default 0,
  score numeric(5,2) not null default 0,
  domain_breakdown jsonb,
  duration_sec int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.exam_simulations enable row level security;
create policy "own sims select" on public.exam_simulations for select using (auth.uid() = user_id);
create policy "own sims insert" on public.exam_simulations for insert with check (auth.uid() = user_id);
create policy "own sims update" on public.exam_simulations for update using (auth.uid() = user_id);

-- CERTIFICATES
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  final_score numeric(5,2) not null,
  modules_completed int not null,
  hours_estimated int not null default 56,
  issued_at timestamptz not null default now()
);
alter table public.certificates enable row level security;
create policy "certificates public verify" on public.certificates for select to anon, authenticated using (true);
create policy "own certificate insert" on public.certificates for insert with check (auth.uid() = user_id);
