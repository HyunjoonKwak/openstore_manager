-- ============================================================
-- 120_ai_settings.sql — AI provider settings + spend cap
--
-- The OpenAI key used to live in stores.api_config, which became
-- legacy_stores in the redesign. AI settings are per user (not per
-- market), so they get their own table. The monthly cap is enforced
-- in the app against ai_usage_logs before every call.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- App-level encrypted secrets: { anthropicApiKey, ... }
  ai_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 0 disables AI entirely; NULL means no cap (not recommended)
  ai_monthly_limit_krw INTEGER NOT NULL DEFAULT 3000 CHECK (ai_monthly_limit_krw >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own user_settings" ON public.user_settings;
CREATE POLICY "own user_settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The provider moved from OpenAI to Claude; allow the new model ids
-- and keep historical rows readable.
ALTER TABLE public.ai_usage_logs
  ALTER COLUMN model TYPE TEXT;

-- Month-to-date spend lookups run on every AI call
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_month
  ON public.ai_usage_logs(user_id, created_at DESC);
