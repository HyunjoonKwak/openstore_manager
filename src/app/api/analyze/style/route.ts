import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJsonReply, AiJsonParseError } from '@/lib/ai/claude'
import { AI_MODEL, formatKrw } from '@/lib/ai/pricing'
import { aiErrorStatus } from '@/lib/ai/http-status'
import { checkRateLimit } from '@/lib/rate-limit'

interface ColorInfo {
  hex: string
  usage: string
  frequency: number
}

interface FontInfo {
  family: string
  usage: string
}

interface KeywordInfo {
  word: string
  frequency: number
  category: 'product' | 'benefit' | 'emotion' | 'action' | 'other'
}

interface StyleAnalysisResult {
  colors: ColorInfo[]
  fonts: FontInfo[]
  keywords: KeywordInfo[]
  copyHighlights: {
    hooks: string[]
    benefits: string[]
    ctas: string[]
  }
  layoutPattern: string
  designRecommendations: string[]
}

function extractColorsFromHtml(html: string): string[] {
  const colorPatterns = [
    /#[0-9A-Fa-f]{6}\b/g,
    /#[0-9A-Fa-f]{3}\b/g,
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi,
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/gi,
  ]

  const colors: string[] = []
  
  for (const pattern of colorPatterns) {
    const matches = html.match(pattern)
    if (matches) {
      colors.push(...matches)
    }
  }

  return [...new Set(colors)]
}

function extractFontsFromHtml(html: string): string[] {
  const fontPattern = /font-family:\s*([^;}"']+)/gi
  const fonts: string[] = []
  
  let match
  while ((match = fontPattern.exec(html)) !== null) {
    const fontValue = match[1].trim()
    fonts.push(fontValue)
  }

  return [...new Set(fonts)]
}

function extractKeywords(text: string): Map<string, number> {
  const koreanWordPattern = /[가-힣]+/g
  const words = text.match(koreanWordPattern) || []
  
  const stopWords = new Set([
    '이', '가', '은', '는', '을', '를', '에', '에서', '의', '와', '과', '로', '으로',
    '도', '만', '까지', '부터', '처럼', '같이', '보다', '에게', '한테', '께',
    '하다', '있다', '없다', '되다', '않다', '이다', '아니다', '것', '수', '등',
    '및', '그', '이런', '저런', '어떤', '모든', '각', '더', '또', '그리고',
  ])

  const wordCounts = new Map<string, number>()
  
  for (const word of words) {
    if (word.length >= 2 && !stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }

  return wordCounts
}

const STYLE_ANALYSIS_PROMPT = `You are an expert in e-commerce design and marketing copy analysis. Analyze the following product page content and extract design and copy insights.

Based on the provided content, colors, fonts, and keywords, provide:

1. Colors: Analyze the color usage and suggest which colors are used for what purpose (background, accent, CTA, text)
2. Fonts: Identify font styles and their usage
3. Keywords: Categorize the top keywords into product, benefit, emotion, action categories
4. Copy Highlights: Extract the best hooks (attention grabbers), benefits (value propositions), and CTAs (call to actions)
5. Layout Pattern: Describe the overall layout pattern
6. Design Recommendations: Provide 3-5 actionable design recommendations

Respond in Korean.

Content:
`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(`analyze-style:${user.id}`, {
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
    const { content, url, rawHtml } = body

    if (!content && !url) {
      return NextResponse.json(
        { error: 'Either content or url is required' },
        { status: 400 }
      )
    }

    let textContent = content
    let htmlContent = rawHtml

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
      htmlContent = validateData.content.rawHtml
    }

    const extractedColors = htmlContent ? extractColorsFromHtml(htmlContent) : []
    const extractedFonts = htmlContent ? extractFontsFromHtml(htmlContent) : []
    const keywordCounts = extractKeywords(textContent || '')
    
    const topKeywords = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => `${word}(${count})`)

    const result = await callClaude({
      usageType: 'benchmarking_style',
      messages: [
        {
          role: 'system',
          content: 'You are an expert e-commerce design analyst. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: `${STYLE_ANALYSIS_PROMPT}

${textContent?.slice(0, 6000)}

Extracted Colors: ${extractedColors.slice(0, 10).join(', ')}
Extracted Fonts: ${extractedFonts.slice(0, 5).join(', ')}
Top Keywords: ${topKeywords.join(', ')}

Respond with a JSON object in this exact format:
{
  "colors": [
    { "hex": "#FF5722", "usage": "CTA 버튼", "frequency": 5 }
  ],
  "fonts": [
    { "family": "Noto Sans KR", "usage": "본문 텍스트" }
  ],
  "keywords": [
    { "word": "프리미엄", "frequency": 8, "category": "benefit" }
  ],
  "copyHighlights": {
    "hooks": ["주목할만한 헤드라인1", "헤드라인2"],
    "benefits": ["핵심 혜택1", "혜택2"],
    "ctas": ["CTA 문구1", "CTA2"]
  },
  "layoutPattern": "레이아웃 패턴 설명",
  "designRecommendations": ["추천1", "추천2", "추천3"]
}`,
        },
      ],
      maxTokens: 2000,
      temperature: 0.3,
      jsonOnly: true,
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: aiErrorStatus(result.code) }
      )
    }

    const responseContent = result.text
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    const analysisResult = parseJsonReply<StyleAnalysisResult>(responseContent)

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
      extracted: {
        colors: extractedColors.slice(0, 10),
        fonts: extractedFonts.slice(0, 5),
        topKeywords: [...keywordCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20),
      },
      usage: usageInfo,
    })

  } catch (error) {
    if (error instanceof AiJsonParseError) {
      console.error('Style analysis — AI reply was not JSON:', error.reply)
      return NextResponse.json({ error: '스타일 분석 응답 형식이 올바르지 않습니다. 다시 시도해주세요.' }, { status: 502 })
    }
    console.error('Style analysis error:', error)
    return NextResponse.json(
      { error: '스타일 분석에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
