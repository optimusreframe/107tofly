-- Add translation relationship fields to questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS translation_group_id uuid,
  ADD COLUMN IF NOT EXISTS source_question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS translated_from_locale text,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS ai_translation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing rows: each becomes its own group, status original
UPDATE public.questions
  SET translation_group_id = id
  WHERE translation_group_id IS NULL;

UPDATE public.questions
  SET translation_status = 'original'
  WHERE translation_status IS NULL OR translation_status = '';

CREATE INDEX IF NOT EXISTS idx_questions_translation_group ON public.questions(translation_group_id);
CREATE INDEX IF NOT EXISTS idx_questions_source_question ON public.questions(source_question_id);
CREATE INDEX IF NOT EXISTS idx_questions_locale_status ON public.questions(locale, status);