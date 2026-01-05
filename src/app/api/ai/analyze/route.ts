import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

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
    const { productName, productDescription, currentTitle, currentFeatures, imageUrl, category } =
      await request.json()

    const apiKey = await getOpenAIKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

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

Please provide a comprehensive analysis with specific improvement suggestions.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('AI Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze product' },
      { status: 500 }
    )
  }
}
