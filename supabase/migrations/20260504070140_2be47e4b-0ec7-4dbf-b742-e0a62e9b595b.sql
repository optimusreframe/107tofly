ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS content_hash text;
UPDATE public.questions SET content_hash = md5(lower(regexp_replace(question, '\s+', ' ', 'g'))) WHERE content_hash IS NULL;
ALTER TABLE public.questions ALTER COLUMN content_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS questions_content_hash_uidx ON public.questions(content_hash);

CREATE TABLE IF NOT EXISTS public.lessons (
  slug text PRIMARY KEY,
  week int NOT NULL,
  day int NOT NULL,
  order_index int NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  body_md text NOT NULL,
  topic public.question_topic,
  est_minutes int NOT NULL DEFAULT 30,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons readable by authenticated"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS lessons_week_day_idx ON public.lessons(week, day);