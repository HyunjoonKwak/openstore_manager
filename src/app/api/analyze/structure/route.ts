import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { AI_MODEL, formatKrw } from '@/lib/ai/pricing'
import { checkRateLimit } from '@/lib/rate-limit'

interface StructureSection {
  type: 'intro' | 'point' | 'proof' | 'offer' | 'cta' | 'other'
  title: string
  content: string
  position: number
}

interface StructureAnalysisResult {
  sections: StructureSection[]
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

const STRUCTURE_ANALYSIS_PROMPT = `You are an expert in analyzing e-commerce product detail pages. Analyze the following product page content and break it down into logical sections.

For each section, identify:
- Type: intro (product introduction/hook), point (key selling point/feature), proof (social proof/reviews/certifications), offer (price/discount/bundle), cta (call to action), other
- Title: A brief title for the section
- Content: Summary of what this section contains
- Position: Order of appearance (1, 2, 3...)

Also provide:
- Summary: Overall page structure assessment
- Strengths: What the page does well
- Weaknesses: Areas for improvement  
- Recommendations: Specific actionable suggestions

Respond in Korean for all text content.

Product Page Content:
`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(`analyze-structure:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const { content, url } = body

    if (!content && !url) {
      return NextResponse.json(
        { error: 'Either content or url is required' },
        { status: 400 }
      )
    }

    let textContent = content

    if (url && !content) {
      const validateResponse = await fetch(new URL('/api/analyze/validate', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ url, scrape: true }),
      })

      const validateData = await validateResponse.json()
      
      if (!validateData.content) {
        return NextResponse.json(
          { error: validateData.error || 'Failed to scrape URL' },
          { status: 400 }
        )
      }

      textContent = validateData.content.bodyText
    }

    const result = await callClaude({
      usageType: 'benchmarking_structure',
      messages: [
        {
          role: 'system',
          content: 'You are an expert e-commerce analyst specializing in product page optimization. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: `${STRUCTURE_ANALYSIS_PROMPT}

${textContent?.slice(0, 8000)}

Respond with a JSON object in this exact format:
{
  "sections": [
    { "type": "intro", "title": "섹션 제목", "content": "섹션 내용 요약", "position": 1 }
  ],
  "summary": "전체 페이지 구조 평가",
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "recommendations": ["개선제안1", "개선제안2"]
}`,
        },
      ] as never,
      maxTokens: 2000,
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'limit_exceeded' ? 429 : result.code === 'no_key' ? 503 : 502 }
      )
    }

    const responseContent = result.text
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    const analysisResult: StructureAnalysisResult = JSON.parse(responseContent)

    const usageInfo = {
      model: AI_MODEL,
      promptTokens: result.inputTokens,
      completionTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
      costUsd: result.costUsd,
      costKrw: formatKrw(result.costUsd),
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      usage: usageInfo,
    })

  } catch (error) {
    console.error('Structure analysis error:', error)
    return NextResponse.json(
      { error: '구조 분석에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
