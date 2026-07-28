-- =====================================================
-- Sprint I2 — Economy tables
-- =====================================================

CREATE TABLE public.user_inventory (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  active_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

GRANT SELECT, INSERT, UPDATE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_select_own" ON public.user_inventory
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "inv_insert_own" ON public.user_inventory
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "inv_update_own" ON public.user_inventory
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER touch_user_inventory
  BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_row();

-- Ledger of XP grants
CREATE TABLE public.xp_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  source_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_user_created_idx ON public.xp_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_events_select_own" ON public.xp_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "xp_events_insert_own" ON public.xp_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Seed starter inventory for every existing user
INSERT INTO public.user_inventory (user_id, item_key, quantity)
SELECT id, 'streak_freeze', 1 FROM auth.users
ON CONFLICT (user_id, item_key) DO NOTHING;

INSERT INTO public.user_inventory (user_id, item_key, quantity)
SELECT id, 'xp_boost', 1 FROM auth.users
ON CONFLICT (user_id, item_key) DO NOTHING;
