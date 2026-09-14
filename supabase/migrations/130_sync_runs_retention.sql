-- 130: sync_runs retention support
--
-- The cron route (/api/cron/sync) now deletes sync_runs older than
-- SYNC_RUN_RETENTION_DAYS (lib/sync/retention.ts, 90 days) on every tick.
-- The existing index covers (market_account_id, started_at) only, so the
-- time-bounded delete needs its own index to stay cheap as history grows.
--
-- Apply manually in the Supabase SQL editor (project is not CLI-linked).

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at
  ON public.sync_runs(started_at);
