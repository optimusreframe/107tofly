
ALTER TYPE public.session_event_kind ADD VALUE IF NOT EXISTS 'feedback';
ALTER TABLE public.session_events ADD COLUMN IF NOT EXISTS note text;
