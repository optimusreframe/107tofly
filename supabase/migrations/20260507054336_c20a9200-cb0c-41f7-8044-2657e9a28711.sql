-- Lessons translations support: add metadata, change PK to id, allow (slug, locale) unique pair

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS translation_group_id uuid,
  ADD COLUMN IF NOT EXISTS source_lesson_id uuid,
  ADD COLUMN IF NOT EXISTS translated_from_locale text,
  ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS ai_translation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: each existing lesson is its own group
UPDATE public.lessons
SET translation_group_id = id
WHERE translation_group_id IS NULL;

UPDATE public.lessons
SET translation_status = 'original'
WHERE translation_status IS NULL OR translation_status = '';

-- Replace primary key from slug -> id, allow (slug, locale) unique pair so EN+ES can share slug
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_pkey' AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons DROP CONSTRAINT lessons_pkey;
  END IF;
END $$;

ALTER TABLE public.lessons ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_slug_locale_uidx ON public.lessons (slug, locale);
CREATE INDEX IF NOT EXISTS lessons_translation_group_idx ON public.lessons (translation_group_id);
CREATE INDEX IF NOT EXISTS lessons_source_lesson_idx ON public.lessons (source_lesson_id);

-- FK source_lesson_id -> lessons(id) (added now that id is PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_source_lesson_fk'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_source_lesson_fk
      FOREIGN KEY (source_lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Allow translation_status values
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_translation_status_chk
  CHECK (translation_status IN ('original','ai_draft','reviewed','published','needs_review')) NOT VALID;
ALTER TABLE public.lessons VALIDATE CONSTRAINT lessons_translation_status_chk;