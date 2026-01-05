import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { recordAiUsage, calculateCost, formatCostKRW } from '@/lib/actions/ai-usage'
import type { Json } from '@/types/database.types'

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

const IMAGE_ANALYSIS_PROMPT = `You are an expert e-commerce analyst. Analyze this product detail page screenshot and provide comprehensive insights.

Analyze the following aspects:

1. **Structure Analysis**:
   - Identify page sections (intro, features, benefits, social proof, offers, CTA)
   - Evaluate the flow and hierarchy of information
   - Note strengths and weaknesses in structure

2. **Design & Style Analysis**:
   - Identify primary and accent colors used
   - Note typography choices and readability
   - Evaluate visual hierarchy and whitespace usage
   - Identify any design patterns or trends

3. **Copy & Marketing Analysis**:
   - Extract key headlines and hooks
   - Identify benefit statements
   - Note call-to-action phrases
   - Evaluate persuasion techniques used

4. **Recommendations**:
   - Provide 3-5 actionable improvement suggestions
   - Note what works well that should be kept

Respond in Korean with a JSON object in this exact format:
{
  "structure": {
    "sections": [
      { "type": "intro|point|proof|offer|cta|other", "title": "섹션 제목", "content": "설명", "position": 1 }
    ],
    "summary": "전체 구조 평가",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"]
  },
  "style": {
    "colors": [
      { "hex": "#색상코드", "usage": "용도", "frequency": 5 }
    ],
    "fonts": [
      { "family": "폰트명", "usage": "용도" }
    ],
    "layoutPattern": "레이아웃 패턴 설명",
    "designRecommendations": ["추천1", "추천2"]
  },
  "copy": {
    "hooks": ["주목할만한 헤드라인들"],
    "benefits": ["핵심 혜택들"],
    "ctas": ["CTA 문구들"],
    "keywords": [
      { "word": "키워드", "frequency": 3, "category": "product|benefit|emotion|action" }
    ]
  },
  "recommendations": ["개선제안1", "개선제안2", "개선제안3"]
}`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('imageUrl') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: 'Image file or URL is required' },
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

    let imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage

    if (imageFile) {
      const bytes = await imageFile.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mimeType = imageFile.type || 'image/png'
      
      imageContent = {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: 'high',
        },
      }
    } else {
      imageContent = {
        type: 'image_url',
        image_url: {
          url: imageUrl!,
          detail: 'high',
        },
      }
    }

    const model = 'gpt-4o'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
            imageContent,
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    })

    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    let analysisResult
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      analysisResult = { rawResponse: responseContent }
    }

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
        usageType: 'benchmarking_image',
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        metadata: { type: 'image_analysis' },
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
      { error: `Image analysis failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
