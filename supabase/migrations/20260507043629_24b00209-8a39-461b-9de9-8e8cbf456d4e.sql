-- Student settings + streak fields
alter table public.profiles
  add column if not exists preferred_language text default 'en',
  add column if not exists preferred_theme text default 'system',
  add column if not exists target_exam_date date,
  add column if not exists study_plan text default '4-week',
  add column if not exists daily_goal_minutes integer default 120;

alter table public.progress
  add column if not exists last_activity_date date;
