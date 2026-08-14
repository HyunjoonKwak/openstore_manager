-- Sync Schedules table for automated order/product synchronization
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('orders', 'products', 'both')),
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync logs table for tracking sync history
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.sync_schedules(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own sync schedules" ON public.sync_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync logs" ON public.sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sync_schedules 
      WHERE sync_schedules.id = sync_logs.schedule_id 
      AND sync_schedules.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_schedules_user_id ON public.sync_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_next_sync ON public.sync_schedules(next_sync_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_logs_schedule_id ON public.sync_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- Function to update next_sync_at
CREATE OR REPLACE FUNCTION public.update_next_sync_at()
RETURNS trigger AS $$
BEGIN
  NEW.next_sync_at = NOW() + (NEW.interval_minutes * INTERVAL '1 minute');
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating next_sync_at
DROP TRIGGER IF EXISTS trigger_update_next_sync_at ON public.sync_schedules;
CREATE TRIGGER trigger_update_next_sync_at
  BEFORE INSERT OR UPDATE OF interval_minutes, is_enabled ON public.sync_schedules
  FOR EACH ROW
  WHEN (NEW.is_enabled = true)
  EXECUTE FUNCTION public.update_next_sync_at();
