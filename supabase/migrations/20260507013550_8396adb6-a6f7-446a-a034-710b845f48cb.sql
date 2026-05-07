
-- Lessons editorial fields
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS media_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- Backfill: existing lessons are considered published
UPDATE public.lessons SET status = 'published' WHERE status IS NULL OR status = '';
UPDATE public.lessons SET published_at = COALESCE(published_at, created_at) WHERE status = 'published' AND published_at IS NULL;

-- Lesson status check via trigger (avoid CHECK rigidness)
CREATE OR REPLACE FUNCTION public.validate_lesson_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','review','published','archived') THEN
    RAISE EXCEPTION 'invalid lesson status: %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lessons_validate_status ON public.lessons;
CREATE TRIGGER lessons_validate_status BEFORE INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_status();

-- Admin RLS for lessons (in addition to existing read by authenticated)
DROP POLICY IF EXISTS "admins manage lessons" ON public.lessons;
CREATE POLICY "admins manage lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Questions editorial fields
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.questions SET status = 'published' WHERE status IS NULL OR status = '';
UPDATE public.questions SET published_at = COALESCE(published_at, created_at) WHERE status = 'published' AND published_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_question_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','reviewed','published','archived') THEN
    RAISE EXCEPTION 'invalid question status: %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS questions_validate_status ON public.questions;
CREATE TRIGGER questions_validate_status BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.validate_question_status();

DROP POLICY IF EXISTS "admins manage questions" ON public.questions;
CREATE POLICY "admins manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS lessons_status_idx ON public.lessons(status);
CREATE INDEX IF NOT EXISTS questions_status_idx ON public.questions(status);
