import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { recordAiUsage, calculateCost, formatCostKRW } from '@/lib/actions/ai-usage'
import type { Json } from '@/types/database.types'

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

interface ApiConfigJson {
  naverClientId?: string
  naverClientSecret?: string
  openaiApiKey?: string
}

async function getOpenAIClient(): Promise<OpenAI | null> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  
  if (!userData.user) {
    return null
  }

  const { data: store } = await supabase
    .from('stores')
    .select('api_config')
    .eq('user_id', userData.user.id)
    .single()

  const apiConfig = (store?.api_config as Json as ApiConfigJson) || {}
  const apiKey = apiConfig.openaiApiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  return new OpenAI({ apiKey })
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
    const body = await request.json()
    const { content, url } = body

    if (!content && !url) {
      return NextResponse.json(
        { error: 'Either content or url is required' },
        { status: 400 }
      )
    }

    const openai = await getOpenAIClient()
    
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in Settings.' },
        { status: 400 }
      )
    }

    let textContent = content

    if (url && !content) {
      const validateResponse = await fetch(new URL('/api/analyze/validate', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    const model = 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({
      model,
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
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    const analysisResult: StructureAnalysisResult = JSON.parse(responseContent)

    const usage = completion.usage
    let usageInfo = null

    if (usage) {
      const costUsd = await calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      const costKrw = await formatCostKRW(costUsd)

      usageInfo = {
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        costUsd,
        costKrw,
      }

      await recordAiUsage({
        usageType: 'benchmarking_structure',
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        metadata: { url: url || null },
      })
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      usage: usageInfo,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Analysis failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
