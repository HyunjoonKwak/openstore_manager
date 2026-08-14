-- Add sync timing columns to sync_schedules
ALTER TABLE public.sync_schedules 
ADD COLUMN IF NOT EXISTS sync_at_minute INTEGER DEFAULT 0 CHECK (sync_at_minute IN (0, 30)),
ADD COLUMN IF NOT EXISTS sync_time TEXT;

-- Drop old trigger that auto-calculates next_sync_at
DROP TRIGGER IF EXISTS trigger_update_next_sync_at ON public.sync_schedules;

-- We now calculate next_sync_at in application code to support:
-- - sync_at_minute: 0 (on the hour) or 30 (on the half hour)
-- - sync_time: specific time for daily sync (e.g., "09:00")
