/*
  # Create search_history table

  1. New Tables
    - `search_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `query` (text)
      - `source` (text) - e.g., 'library', 'concept', 'convergence'
      - `metadata` (jsonb) - for storing filters, lens weights, etc.
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `search_history` table
    - Add policies for authenticated users to manage their own history
*/

CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  source text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
  ON public.search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster querying by user and date
CREATE INDEX IF NOT EXISTS idx_search_history_user_created 
  ON public.search_history(user_id, created_at DESC);
