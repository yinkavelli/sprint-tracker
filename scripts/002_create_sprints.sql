-- Create sprints table for user goals/sprints
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'custom', -- 'fitness', 'learning', 'project', 'habit', 'custom'
  duration_months INTEGER NOT NULL DEFAULT 6,
  target_value NUMERIC,
  target_unit TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
  config JSONB DEFAULT '{}', -- Store track metadata, milestones, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "sprints_select_own" ON public.sprints 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sprints_insert_own" ON public.sprints 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sprints_update_own" ON public.sprints 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sprints_delete_own" ON public.sprints 
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sprints_user_id ON public.sprints(user_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
