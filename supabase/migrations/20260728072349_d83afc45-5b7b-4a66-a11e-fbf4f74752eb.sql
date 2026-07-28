CREATE TABLE public.weekly_xp (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  tier TEXT NOT NULL DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

CREATE INDEX weekly_xp_week_idx ON public.weekly_xp (week_start, xp DESC);

GRANT SELECT, INSERT, UPDATE ON public.weekly_xp TO authenticated;
GRANT ALL ON public.weekly_xp TO service_role;

ALTER TABLE public.weekly_xp ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read the whole leaderboard.
CREATE POLICY "weekly_xp_read_all" ON public.weekly_xp
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_xp_insert_own" ON public.weekly_xp
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "weekly_xp_update_own" ON public.weekly_xp
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER touch_weekly_xp
  BEFORE UPDATE ON public.weekly_xp
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();
