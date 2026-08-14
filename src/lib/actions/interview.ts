'use server'

import OpenAI from 'openai'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import {
  CATEGORY_TO_TEMPLATE,
  nextQuestion,
  interviewProgress,
  type InterviewQuestion,
} from '@/lib/studio/interview-flow'
import { buildRenderContext, renderTemplate, type RenderSections } from '@/lib/studio/render'
import type { InterviewSessionRow, StudioTemplateRow } from '@/types/redesign.types'

// Interview actions ported from detailpage_maker's FastAPI routers.
// Sessions live in interview_sessions; generation renders a
// studio_templates HTML with AI copywriting when a key is available.

export interface InterviewState {
  sessionId: string
  status: string
  context: Record<string, unknown>
  question: InterviewQuestion
  progress: number
}

function toState(session: InterviewSessionRow): InterviewState {
  const context = (session.context || {}) as Record<string, unknown>
  return {
    sessionId: session.id,
    status: session.status,
    context,
    question: nextQuestion(context),
    progress: interviewProgress(context),
  }
}

export async function createInterviewSession(): Promise<{
  data: InterviewState | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({ user_id: userId })
    .select('*')
    .single()

  if (error || !data) return { data: null, error: error?.message || '세션 생성 실패' }
  return { data: toState(data as unknown as InterviewSessionRow), error: null }
}

export async function getInterviewSession(sessionId: string): Promise<{
  data: InterviewState | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: '세션을 찾을 수 없습니다.' }
  return { data: toState(data as unknown as InterviewSessionRow), error: null }
}

export async function submitInterviewAnswer(input: {
  sessionId: string
  fieldName: string
  value: string
}): Promise<{ data: InterviewState | null; error: string | null }> {
  const supabase = await createRedesignClient()
  const { data: sessionData, error: fetchError } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('id', input.sessionId)
    .maybeSingle()

  if (fetchError) return { data: null, error: fetchError.message }
  if (!sessionData) return { data: null, error: '세션을 찾을 수 없습니다.' }

  const session = sessionData as unknown as InterviewSessionRow
  const context = {
    ...((session.context || {}) as Record<string, unknown>),
    [input.fieldName]: input.value,
  }

  const upcoming = nextQuestion(context)
  const status = upcoming.inputType === 'complete' ? 'completed' : 'in_progress'

  const { data: updated, error } = await supabase
    .from('interview_sessions')
    .update({ context: context as InterviewSessionRow['context'], status })
    .eq('id', input.sessionId)
    .select('*')
    .single()

  if (error || !updated) return { data: null, error: error?.message || '답변 저장 실패' }
  return { data: toState(updated as unknown as InterviewSessionRow), error: null }
}

// ------------------------------------------------------------------
// Generation
// ------------------------------------------------------------------

async function generateCopywriting(
  context: Record<string, unknown>
): Promise<Partial<RenderSections> | null> {
  // Server-level key only; per-user OpenAI keys stay on the legacy AI
  // routes until they move to market_accounts config
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `다음 상품 정보로 상세페이지 카피 5개를 JSON으로 작성해줘.
상품 정보: ${JSON.stringify(context)}
형식: {"hero": "메인 타이틀", "features": "특징/장점 한 문장", "benefits": "고객 혜택 한 문장", "details": "상세 정보 한 문장", "cta": "구매 유도 한 문장"}
각 값은 한국어 한 문장, 과장 없이.`,
        },
      ],
    })
    const text = completion.choices[0]?.message?.content
    if (!text) return null
    return JSON.parse(text) as Partial<RenderSections>
  } catch (error) {
    console.error('Interview copywriting failed:', error)
    return null
  }
}

export interface GenerationResult {
  generationId: string
  htmlContent: string
}

export async function generateFromInterview(input: {
  sessionId: string
  templateId?: string
}): Promise<{ data: GenerationResult | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: sessionData } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('id', input.sessionId)
    .maybeSingle()

  if (!sessionData) return { data: null, error: '세션을 찾을 수 없습니다.' }
  const session = sessionData as unknown as InterviewSessionRow
  if (session.status !== 'completed') {
    return { data: null, error: '문답이 완료되지 않았습니다.' }
  }

  const context = (session.context || {}) as Record<string, unknown>

  // Template: explicit id, else default template of the mapped category
  let template: StudioTemplateRow | null = null
  if (input.templateId) {
    const { data } = await supabase
      .from('studio_templates')
      .select('*')
      .eq('id', input.templateId)
      .maybeSingle()
    template = data as unknown as StudioTemplateRow | null
  }
  if (!template) {
    const category =
      CATEGORY_TO_TEMPLATE[(context.category as string) || ''] || 'default'
    const { data } = await supabase
      .from('studio_templates')
      .select('*')
      .eq('category', category)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle()
    template = data as unknown as StudioTemplateRow | null
  }
  if (!template) return { data: null, error: '사용할 템플릿이 없습니다. 템플릿을 먼저 등록해주세요.' }

  const sections = await generateCopywriting(context)
  const htmlContent = renderTemplate(
    template.html_template,
    buildRenderContext(context, sections || undefined)
  )

  const { data: generation, error } = await supabase
    .from('interview_generations')
    .insert({
      session_id: session.id,
      product_name: (context.product_name as string) || null,
      template_id: template.id,
      output_format: 'html',
      html_content: htmlContent,
    })
    .select('id')
    .single()

  if (error || !generation) return { data: null, error: error?.message || '생성 기록 실패' }

  return {
    data: { generationId: (generation as unknown as { id: string }).id, htmlContent },
    error: null,
  }
}

// ------------------------------------------------------------------
// Templates (gallery)
// ------------------------------------------------------------------

export async function getStudioTemplates(): Promise<{
  data: StudioTemplateRow[] | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  const { data, error } = await supabase
    .from('studio_templates')
    .select('*')
    .order('category')
    .order('is_default', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data || []) as unknown as StudioTemplateRow[], error: null }
}
