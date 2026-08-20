import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { testClaudeConnection } from '@/lib/ai/claude'
import { AI_MODEL } from '@/lib/ai/pricing'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(
      `ai-test-connection:${userData.user.id}`,
      { limit: 20, windowMs: 60_000 }
    )
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const { ok, error } = await testClaudeConnection()

    if (!ok) {
      const message = error ?? 'Unknown error'
      const status = /api[_ -]?key|authentication|401/i.test(message)
        ? 401
        : /rate.?limit|quota|credit/i.test(message)
          ? 429
          : 400
      return NextResponse.json({ success: false, error: message }, { status })
    }

    return NextResponse.json({
      success: true,
      message: 'Anthropic API 연결 성공!',
      details: { model: AI_MODEL },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Claude connection test error:', message)
    return NextResponse.json(
      { success: false, error: `연결 테스트 실패: ${message}` },
      { status: 500 }
    )
  }
}
