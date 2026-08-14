-- ============================================================
-- 110_studio_schema.sql — 판매페이지 스튜디오 (detailpage_maker 통합)
--
-- Existing studio tables (detail_pages, analysis_logs, saved_assets,
-- benchmark_*) are kept as-is. This adds the interview flow imported
-- from detailpage_maker (FastAPI/SQLite → Supabase).
-- Template seeds ship separately in 111_seed_studio_templates.sql.
-- ============================================================

-- 문답 세션: 수집된 답변은 context JSONB에 필드별로 쌓인다
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  -- {"product_name": "...", "category": "...", "usp": "...", ...}
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 세션에서 생성된 상세페이지 이력
CREATE TABLE IF NOT EXISTS public.interview_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  product_name TEXT,
  template_id UUID,
  output_format TEXT NOT NULL DEFAULT 'html' CHECK (output_format IN ('html', 'image', 'both')),
  html_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 상세페이지 템플릿: user_id NULL = 공용 시드 템플릿
CREATE TABLE IF NOT EXISTS public.studio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interview_generations
  DROP CONSTRAINT IF EXISTS interview_generations_template_id_fkey;
ALTER TABLE public.interview_generations
  ADD CONSTRAINT interview_generations_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.studio_templates(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own interview_sessions" ON public.interview_sessions;
CREATE POLICY "own interview_sessions" ON public.interview_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own interview_generations" ON public.interview_generations;
CREATE POLICY "own interview_generations" ON public.interview_generations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.interview_sessions s
    WHERE s.id = interview_generations.session_id AND s.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.interview_sessions s
    WHERE s.id = interview_generations.session_id AND s.user_id = auth.uid()
  ));

-- 공용 시드(user_id IS NULL)는 읽기만, 내 템플릿은 전체 권한
DROP POLICY IF EXISTS "read shared templates" ON public.studio_templates;
CREATE POLICY "read shared templates" ON public.studio_templates
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "manage own templates" ON public.studio_templates;
CREATE POLICY "manage own templates" ON public.studio_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes + updated_at triggers
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user
  ON public.interview_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_generations_session
  ON public.interview_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_studio_templates_category
  ON public.studio_templates(category);

DROP TRIGGER IF EXISTS trg_interview_sessions_updated_at ON public.interview_sessions;
CREATE TRIGGER trg_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_studio_templates_updated_at ON public.studio_templates;
CREATE TRIGGER trg_studio_templates_updated_at
  BEFORE UPDATE ON public.studio_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
