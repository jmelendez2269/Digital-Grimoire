-- Add sort_order column to courses for manual display ordering
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
