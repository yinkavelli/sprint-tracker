-- Create sprint_tasks table for individual tasks within a sprint
CREATE TABLE IF NOT EXISTS public.sprint_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- Which month this task belongs to (1-6)
  track TEXT NOT NULL, -- Track name (e.g., 'certification', 'build', 'brand')
  task_index INTEGER NOT NULL, -- Order within the track
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tasks_select_own" ON public.sprint_tasks 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own" ON public.sprint_tasks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.sprint_tasks 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.sprint_tasks 
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_id ON public.sprint_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_user_id ON public.sprint_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_month ON public.sprint_tasks(month);

-- Unique constraint to prevent duplicate tasks
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprint_tasks_unique 
  ON public.sprint_tasks(sprint_id, month, track, task_index);
