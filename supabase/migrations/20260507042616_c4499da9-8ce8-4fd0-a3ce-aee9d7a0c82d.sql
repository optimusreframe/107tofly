
alter table public.quiz_attempts
  add column if not exists lesson_id uuid,
  add column if not exists lesson_slug text,
  add column if not exists attempt_type text default 'practice';

create table if not exists public.lesson_quiz_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid,
  lesson_slug text not null,
  best_score integer not null default 0,
  attempts_count integer not null default 0,
  passed boolean not null default false,
  xp_awarded boolean not null default false,
  last_attempt_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_slug)
);

alter table public.lesson_quiz_progress enable row level security;

drop policy if exists "own lesson_quiz_progress select" on public.lesson_quiz_progress;
create policy "own lesson_quiz_progress select"
  on public.lesson_quiz_progress for select
  using (auth.uid() = user_id);

drop policy if exists "own lesson_quiz_progress insert" on public.lesson_quiz_progress;
create policy "own lesson_quiz_progress insert"
  on public.lesson_quiz_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "own lesson_quiz_progress update" on public.lesson_quiz_progress;
create policy "own lesson_quiz_progress update"
  on public.lesson_quiz_progress for update
  using (auth.uid() = user_id);

drop policy if exists "admins read lesson_quiz_progress" on public.lesson_quiz_progress;
create policy "admins read lesson_quiz_progress"
  on public.lesson_quiz_progress for select
  using (has_role(auth.uid(), 'admin'::app_role));
