
-- =========================================
-- app_settings
-- =========================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_app_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_app_settings ON public.app_settings;
CREATE TRIGGER trg_touch_app_settings
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_app_settings();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings admins manage" ON public.app_settings;
CREATE POLICY "settings admins manage" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "settings public read" ON public.app_settings;
CREATE POLICY "settings public read" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- Seed (idempotent)
INSERT INTO public.app_settings (key, value, category, description, is_public) VALUES
  ('app.name', '"107toFly"'::jsonb, 'general', 'Application name', true),
  ('app.support_email', '"support@107tofly.com"'::jsonb, 'general', 'Support email address', true),
  ('app.default_language', '"en"'::jsonb, 'general', 'Default language', true),
  ('app.enabled_languages', '["en","es"]'::jsonb, 'general', 'Enabled languages', true),
  ('app.default_theme', '"system"'::jsonb, 'general', 'Default theme', true),

  ('study.lesson_completion_xp', '15'::jsonb, 'study', 'XP for lesson completion', false),
  ('study.quiz_pass_score', '70'::jsonb, 'study', 'Quiz pass score', false),
  ('study.exam_pass_score', '70'::jsonb, 'study', 'Exam pass score', false),
  ('study.exam_ready_score', '85'::jsonb, 'study', 'Exam ready threshold', false),
  ('study.level_xp_step', '400'::jsonb, 'study', 'XP per level', true),
  ('study.daily_goal_minutes', '120'::jsonb, 'study', 'Daily study goal (min)', true),

  ('certificate.min_course_completion_percent', '100'::jsonb, 'certificate', 'Min course completion %', false),
  ('certificate.min_quiz_average', '80'::jsonb, 'certificate', 'Min quiz average', false),
  ('certificate.required_exam_simulations', '2'::jsonb, 'certificate', 'Required exam simulations', false),
  ('certificate.min_latest_exam_score', '85'::jsonb, 'certificate', 'Min latest exam score', false),
  ('certificate.estimated_hours', '56'::jsonb, 'certificate', 'Estimated course hours', true),
  ('certificate.disclaimer_en', '"This is an internal 107toFly course completion certificate. It does not replace the FAA Remote Pilot Certificate."'::jsonb, 'certificate', 'EN disclaimer', true),
  ('certificate.disclaimer_es', '"Este es un certificado interno de 107toFly. No reemplaza al Remote Pilot Certificate de la FAA."'::jsonb, 'certificate', 'ES disclaimer', true),
  ('certificate.template_style', '"premium"'::jsonb, 'certificate', 'Template style', true),

  ('features.flycoach_enabled', 'true'::jsonb, 'features', 'FlyCoach enabled', true),
  ('features.certificates_enabled', 'true'::jsonb, 'features', 'Certificates enabled', true),
  ('features.pwa_enabled', 'true'::jsonb, 'features', 'PWA enabled', true),
  ('features.maintenance_mode', 'false'::jsonb, 'features', 'Maintenance mode', true),
  ('features.payments_enabled', 'false'::jsonb, 'features', 'Payments enabled', true),
  ('features.media_uploads_enabled', 'false'::jsonb, 'features', 'Media uploads enabled', true)
ON CONFLICT (key) DO NOTHING;

-- =========================================
-- certificates: status / revocation
-- =========================================
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revoke_reason text;

CREATE OR REPLACE FUNCTION public.validate_certificate_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('active','revoked') THEN
    RAISE EXCEPTION 'invalid certificate status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_certificate_status ON public.certificates;
CREATE TRIGGER trg_validate_certificate_status
BEFORE INSERT OR UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.validate_certificate_status();
