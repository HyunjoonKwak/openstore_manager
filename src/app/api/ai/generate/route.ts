import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { recordAiUsage, calculateCost, formatCostKRW } from '@/lib/actions/ai-usage'
import { resolveCurrentStoreId } from '@/lib/stores/current-store'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptSecret } from '@/lib/secret-crypto'

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
      .eq('id', await resolveCurrentStoreId(supabase, userData.user.id) || '')
      .maybeSingle()
    
    const apiConfig = (store?.api_config || {}) as ApiConfigJson
    if (apiConfig.openaiApiKey) {
      // Stored encrypted at rest; legacy plaintext passes through unchanged
      return decryptSecret(apiConfig.openaiApiKey)
    }
  }
  
  return process.env.OPENAI_API_KEY || null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(`ai-generate:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const {
      keywords,
      category,
      tone,
      audience,
      proof,
      product,
      benchmarkContext,
      options = {},
    } = await request.json()

    if (typeof keywords !== 'string' || keywords.trim().length < 2) {
      return NextResponse.json({ error: '상품명 또는 키워드를 입력해주세요.' }, { status: 400 })
    }

    const apiKey = await getOpenAIKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const safeBenchmarkContext = typeof benchmarkContext === 'string'
      ? benchmarkContext.slice(0, 8_000)
      : ''
    const safeProof = typeof proof === 'string' ? proof.slice(0, 2_000) : ''

    const systemPrompt = `You are a senior Korean e-commerce strategist and product-page copywriter.
Create an original, mobile-first sales page for Naver SmartStore or similar marketplaces.

Hard rules:
- Use competitor research only as structural inspiration. Never copy source wording, names, or images.
- Never invent certifications, test results, awards, reviews, quantities, performance figures, or guarantees.
- If proof is absent, write a transparent request to verify product specifications instead of fabricating proof.
- Turn features into customer benefits and concrete usage scenes.
- Keep headings short and scannable in Korean.

Category: ${category}
Tone: ${tone}
${options.seo ? 'Apply the supplied search keywords naturally to the title and opening copy.' : 'Do not force SEO keywords.'}

Output JSON format:
{
  "title": "search-friendly product title, max 100 Korean characters",
  "heroKicker": "short opening promise",
  "targetAudience": "one sentence describing the customer and usage situation",
  "problemTitle": "customer problem section heading",
  "problemBody": "2-3 sentences that empathize without exaggeration",
  "features": ["exactly 3-5 concrete benefit statements"],
  "comparisonTitle": "selection criteria heading",
  "comparisonBody": "how to compare this category fairly, using only supplied facts",
  "proofTitle": "trust section heading",
  "proofBody": "only supplied evidence, or a clear verification notice",
  "faq": [{"question":"purchase concern", "answer":"honest answer"}],
  "ctaText": "final low-pressure call to action",
  "description": "marketplace summary description, 200-300 Korean characters"
}`

    const userPrompt = `Create the sales page from the following brief.

Product / keywords: ${keywords.trim()}
Registered product facts: ${product ? JSON.stringify(product) : 'Not linked'}
Target audience: ${typeof audience === 'string' && audience.trim() ? audience.trim() : 'Infer conservatively from the product category'}
Verified evidence supplied by seller: ${safeProof || 'None supplied'}

Benchmark research brief:
${safeBenchmarkContext || 'No benchmark project linked'}

Return JSON only.`

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
        metadata: {
          keywords,
          category,
          tone,
          hasBenchmarkContext: Boolean(safeBenchmarkContext),
        },
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
