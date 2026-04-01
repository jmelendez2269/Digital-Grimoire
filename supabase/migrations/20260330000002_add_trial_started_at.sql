-- 7-day trial: track when a free user first activated their trial
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;
