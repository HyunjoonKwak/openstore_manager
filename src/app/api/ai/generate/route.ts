import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { recordAiUsage, calculateCost, formatCostKRW } from '@/lib/actions/ai-usage'

interface ApiConfigJson {
  openaiApiKey?: string
}

async function getOpenAIKey(): Promise<string | null> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  
  if (userData.user) {
    const { data: store } = await supabase
      .from('stores')
      .select('api_config')
      .eq('user_id', userData.user.id)
      .single()
    
    const apiConfig = (store?.api_config || {}) as ApiConfigJson
    if (apiConfig.openaiApiKey) {
      return apiConfig.openaiApiKey
    }
  }
  
  return process.env.OPENAI_API_KEY || null
}

export async function POST(request: Request) {
  try {
    const { keywords, category, tone, options } = await request.json()

    const apiKey = await getOpenAIKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are an expert e-commerce product copywriter for Korean online stores (Naver SmartStore, Coupang, etc.).
Generate compelling product content in Korean.

Category: ${category}
Tone: ${tone}
${options.seo ? 'Include SEO optimization for Korean search engines.' : ''}
${options.html ? 'Include basic HTML formatting.' : 'Plain text only.'}

Output JSON format:
{
  "title": "Product title (max 200 chars, include main keywords)",
  "features": ["5 key features as bullet points"],
  "description": "Compelling product description (200-300 chars)"
}`

    const userPrompt = `Generate product content for: ${keywords}`

    const model = 'gpt-4o'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content generated')
    }

    const parsed = JSON.parse(content)

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
        usageType: 'ai_generate',
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        metadata: { keywords, category, tone },
      })
    }

    return NextResponse.json({ ...parsed, usage: usageInfo })
  } catch (error) {
    console.error('AI Generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
