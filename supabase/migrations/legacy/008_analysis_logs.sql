CREATE TABLE IF NOT EXISTS analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  target_platform TEXT NOT NULL DEFAULT 'unknown',
  analysis_result JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_logs_user_id ON analysis_logs(user_id);
CREATE INDEX idx_analysis_logs_created_at ON analysis_logs(created_at DESC);

ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis logs"
  ON analysis_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis logs"
  ON analysis_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis logs"
  ON analysis_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis logs"
  ON analysis_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saved_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES analysis_logs(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_url TEXT,
  content TEXT
);

CREATE INDEX idx_saved_assets_log_id ON saved_assets(log_id);

ALTER TABLE saved_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved assets"
  ON saved_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM analysis_logs WHERE analysis_logs.id = saved_assets.log_id AND analysis_logs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own saved assets"
  ON saved_assets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM analysis_logs WHERE analysis_logs.id = saved_assets.log_id AND analysis_logs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own saved assets"
  ON saved_assets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM analysis_logs WHERE analysis_logs.id = saved_assets.log_id AND analysis_logs.user_id = auth.uid()
  ));
