import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJsonReply, AiJsonParseError } from '@/lib/ai/claude'
import { toImageBlock, isSupportedImageType, MAX_IMAGE_BYTES } from '@/lib/ai/images'
import { AI_MODEL, formatKrw } from '@/lib/ai/pricing'
import { aiErrorStatus } from '@/lib/ai/http-status'
import { checkRateLimit } from '@/lib/rate-limit'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(`analyze-image:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('imageUrl') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: 'Image file or URL is required' },
        { status: 400 }
      )
    }

    let imageSource: string

    if (imageFile) {
      // Anthropic rejects images over 5MB and unknown media types; catch both
      // here so the user gets a reason instead of an opaque provider error
      if (imageFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `이미지가 너무 큽니다. ${MAX_IMAGE_BYTES / 1_000_000}MB 이하로 올려주세요.` },
          { status: 413 }
        )
      }
      const mimeType = (imageFile.type || '').toLowerCase()
      if (!isSupportedImageType(mimeType)) {
        return NextResponse.json(
          { error: '지원하지 않는 이미지 형식입니다. JPEG·PNG·GIF·WebP만 가능합니다.' },
          { status: 415 }
        )
      }

      const bytes = await imageFile.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      imageSource = `data:${mimeType};base64,${base64}`
    } else {
      imageSource = imageUrl!
    }

    const result = await callClaude({
      usageType: 'benchmarking_image',
      messages: [
        {
          role: 'user',
          content: [toImageBlock(imageSource), { type: 'text', text: IMAGE_ANALYSIS_PROMPT }],
        },
      ],
      maxTokens: 4000,
      temperature: 0.3,
      jsonOnly: true,
      metadata: { type: 'image_analysis', source: imageFile ? 'upload' : 'url' },
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: aiErrorStatus(result.code) })
    }

    const responseContent = result.text

    const analysisResult = parseJsonReply<Record<string, unknown>>(responseContent)

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
    if (error instanceof AiJsonParseError) {
      console.error('Image analysis — AI reply was not JSON:', error.reply)
      return NextResponse.json(
        { error: '이미지 분석 응답 형식이 올바르지 않습니다. 다시 시도해주세요.' },
        { status: 502 }
      )
    }
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { error: '이미지 분석에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
