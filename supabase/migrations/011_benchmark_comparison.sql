CREATE TABLE IF NOT EXISTS benchmark_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  my_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  my_page_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  platform TEXT DEFAULT 'unknown',
  thumbnail_url TEXT,
  scroll_position INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  page_id UUID REFERENCES benchmark_pages(id) ON DELETE CASCADE,
  is_my_page BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  scroll_position INTEGER DEFAULT 0,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  reference_image_url TEXT,
  priority INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES benchmark_sessions(id) ON DELETE CASCADE,
  page_id UUID REFERENCES benchmark_pages(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'screenshot', 'text')),
  url TEXT,
  content TEXT,
  filename TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benchmark_sessions_user_id ON benchmark_sessions(user_id);
CREATE INDEX idx_benchmark_sessions_status ON benchmark_sessions(status);
CREATE INDEX idx_benchmark_pages_session_id ON benchmark_pages(session_id);
CREATE INDEX idx_benchmark_memos_session_id ON benchmark_memos(session_id);
CREATE INDEX idx_benchmark_checklists_session_id ON benchmark_checklists(session_id);
CREATE INDEX idx_benchmark_assets_session_id ON benchmark_assets(session_id);

ALTER TABLE benchmark_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own benchmark sessions"
  ON benchmark_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage benchmark pages via session"
  ON benchmark_pages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM benchmark_sessions WHERE benchmark_sessions.id = benchmark_pages.session_id AND benchmark_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage benchmark memos via session"
  ON benchmark_memos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM benchmark_sessions WHERE benchmark_sessions.id = benchmark_memos.session_id AND benchmark_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage benchmark checklists via session"
  ON benchmark_checklists FOR ALL
  USING (EXISTS (
    SELECT 1 FROM benchmark_sessions WHERE benchmark_sessions.id = benchmark_checklists.session_id AND benchmark_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage benchmark assets via session"
  ON benchmark_assets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM benchmark_sessions WHERE benchmark_sessions.id = benchmark_assets.session_id AND benchmark_sessions.user_id = auth.uid()
  ));
