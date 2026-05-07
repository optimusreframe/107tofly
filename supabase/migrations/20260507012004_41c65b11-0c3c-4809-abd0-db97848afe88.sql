-- Add membership columns to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'active';

-- Admin audit logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "admins read audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "admins insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_user_idx
  ON public.admin_audit_logs (target_user_id, created_at DESC);