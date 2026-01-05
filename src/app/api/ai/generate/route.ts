import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { keywords, category, tone, options } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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
    console.error('AI Generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
