
-- Enums
DO $$ BEGIN
  CREATE TYPE public.learning_unit_status AS ENUM ('draft','review','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exercise_kind AS ENUM ('mcq','cloze','order','match');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_event_kind AS ENUM ('start','answer','end');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- learning_units
CREATE TABLE public.learning_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  lesson_id UUID,
  status public.learning_unit_status NOT NULL DEFAULT 'draft',
  translation_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);
CREATE INDEX learning_units_status_idx ON public.learning_units(status);
CREATE INDEX learning_units_locale_idx ON public.learning_units(locale);
CREATE INDEX learning_units_tg_idx ON public.learning_units(translation_group_id);

GRANT SELECT ON public.learning_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_units TO authenticated;
GRANT ALL ON public.learning_units TO service_role;

ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published units are publicly readable"
  ON public.learning_units FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins read all units"
  ON public.learning_units FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert units"
  ON public.learning_units FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update units"
  ON public.learning_units FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete units"
  ON public.learning_units FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- concepts
CREATE TABLE public.concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.learning_units(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body_md TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX concepts_unit_idx ON public.concepts(unit_id);

GRANT SELECT ON public.concepts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concepts TO authenticated;
GRANT ALL ON public.concepts TO service_role;

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Concepts readable when parent unit is published"
  ON public.concepts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.learning_units u
    WHERE u.id = concepts.unit_id AND u.status = 'published'
  ));

CREATE POLICY "Admins read all concepts"
  ON public.concepts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert concepts"
  ON public.concepts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update concepts"
  ON public.concepts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete concepts"
  ON public.concepts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- exercises
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  kind public.exercise_kind NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT,
  difficulty SMALLINT NOT NULL DEFAULT 1,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exercises_concept_idx ON public.exercises(concept_id);

-- Exercises: never expose answer/explanation via anon SELECT; only admins can read raw row.
-- Public app fetches safe DTO through server functions (service role, projected columns).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all exercises"
  ON public.exercises FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert exercises"
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update exercises"
  ON public.exercises FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete exercises"
  ON public.exercises FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- mastery
CREATE TABLE public.mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL DEFAULT 0,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);
CREATE INDEX mastery_due_idx ON public.mastery(user_id, next_due_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery TO authenticated;
GRANT ALL ON public.mastery TO service_role;

ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own mastery"
  ON public.mastery FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- session_events
CREATE TABLE public.session_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.learning_units(id) ON DELETE SET NULL,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  kind public.session_event_kind NOT NULL,
  correct BOOLEAN,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX session_events_user_idx ON public.session_events(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT ALL ON public.session_events TO service_role;

ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own session events"
  ON public.session_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own session events"
  ON public.session_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- updated_at triggers reuse existing pattern
CREATE OR REPLACE FUNCTION public.touch_learning_row()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_learning_units_touch BEFORE UPDATE ON public.learning_units
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();
CREATE TRIGGER trg_concepts_touch BEFORE UPDATE ON public.concepts
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();
CREATE TRIGGER trg_exercises_touch BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();
CREATE TRIGGER trg_mastery_touch BEFORE UPDATE ON public.mastery
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();
