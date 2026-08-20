import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { AI_MODEL, formatKrw } from '@/lib/ai/pricing'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(`ai-analyze:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const { productName, productDescription, currentTitle, currentFeatures, imageUrl, category, benchmarkContext } =
      await request.json()

    const systemPrompt = `You are an expert e-commerce product page analyst specializing in Korean online marketplaces (Naver SmartStore, Coupang, etc.).

Analyze the provided product detail page content and provide specific, actionable improvement suggestions.

Your analysis should cover:
1. SEO Optimization - Title keywords, search visibility
2. Conversion Rate - Compelling copy, trust signals
3. Information Structure - Clear, scannable layout
4. Mobile Readability - Length, formatting
5. Competitive Positioning - Unique value proposition

Respond in Korean with specific, actionable suggestions.

Output JSON format:
{
  "overallScore": number (1-100),
  "seoScore": number (1-100),
  "conversionScore": number (1-100),
  "readabilityScore": number (1-100),
  "improvements": [
    {
      "category": "SEO" | "Conversion" | "Readability" | "Structure",
      "issue": "specific problem identified",
      "suggestion": "specific fix recommendation",
      "priority": "high" | "medium" | "low",
      "impact": "expected improvement from this change"
    }
  ],
  "suggestedTitle": "improved product title",
  "suggestedFeatures": ["improved feature 1", "improved feature 2", ...],
  "suggestedDescription": "improved product description",
  "competitorInsights": "brief analysis of how to differentiate"
}`

    const userPrompt = `Analyze this product detail page:

Product Name: ${productName}
Category: ${category || 'Unknown'}
Current Title: ${currentTitle || productName}
Current Features: ${currentFeatures?.join(', ') || 'Not provided'}
Product Description: ${productDescription || 'Not provided'}
${imageUrl ? `Product Image URL: ${imageUrl}` : ''}
${typeof benchmarkContext === 'string' && benchmarkContext.trim() ? `Benchmark research and improvement notes:\n${benchmarkContext.slice(0, 8000)}` : ''}

Please provide a comprehensive analysis with specific improvement suggestions.`

    const result = await callClaude({
      usageType: 'ai_analyze',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ] as never,
      maxTokens: 4000,
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'limit_exceeded' ? 429 : result.code === 'no_key' ? 503 : 502 }
      )
    }

    const content = result.text
    if (!content) {
      throw new Error('No content generated')
    }

    const parsed = JSON.parse(content)

    const usageInfo = {
      model: AI_MODEL,
      promptTokens: result.inputTokens,
      completionTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
      costUsd: result.costUsd,
      costKrw: formatKrw(result.costUsd),
    }

    return NextResponse.json({ ...parsed, usage: usageInfo })
  } catch (error) {
    console.error('AI Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze product' },
      { status: 500 }
    )
  }
}
