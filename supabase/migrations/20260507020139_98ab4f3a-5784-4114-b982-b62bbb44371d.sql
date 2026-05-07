
-- Landing CMS: landing_sections
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  title text,
  subtitle text,
  body text,
  cta_label text,
  cta_href text,
  image_url text,
  video_url text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'published',
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_key, locale)
);

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landing public read published" ON public.landing_sections;
CREATE POLICY "landing public read published"
  ON public.landing_sections FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "landing admins manage" ON public.landing_sections;
CREATE POLICY "landing admins manage"
  ON public.landing_sections FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_landing_sections()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status NOT IN ('draft','published','archived') THEN
    RAISE EXCEPTION 'invalid landing status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_landing_sections ON public.landing_sections;
CREATE TRIGGER trg_touch_landing_sections
BEFORE INSERT OR UPDATE ON public.landing_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_landing_sections();

-- Seed sections idempotently
DO $$
DECLARE
  loc text;
  sec text;
  keys text[] := ARRAY['hero','features','course_modules','ai_tutor','exam_simulator','certificate','pricing','faq','disclaimer'];
  locales text[] := ARRAY['en','es'];
  idx int;
BEGIN
  FOREACH loc IN ARRAY locales LOOP
    idx := 0;
    FOREACH sec IN ARRAY keys LOOP
      INSERT INTO public.landing_sections (section_key, locale, title, status, sort_order, published_at)
      VALUES (sec, loc, initcap(replace(sec,'_',' ')), 'published', idx, now())
      ON CONFLICT (section_key, locale) DO NOTHING;
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- Media Library
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  file_name text NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  file_size bigint,
  storage_path text,
  public_url text,
  alt_text text,
  caption text,
  locale text DEFAULT 'en',
  tags text[] NOT NULL DEFAULT '{}',
  usage_context text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media public read active" ON public.media_assets;
CREATE POLICY "media public read active"
  ON public.media_assets FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "media admins manage" ON public.media_assets;
CREATE POLICY "media admins manage"
  ON public.media_assets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_media_assets()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status NOT IN ('active','archived') THEN
    RAISE EXCEPTION 'invalid media status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_media_assets ON public.media_assets;
CREATE TRIGGER trg_touch_media_assets
BEFORE INSERT OR UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_media_assets();
