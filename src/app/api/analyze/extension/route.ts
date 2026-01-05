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

interface ExtensionPayload {
  url: string
  platform: string
  extractedAt: string
  product: {
    title?: string
    price?: number
    originalPrice?: number
    discountRate?: string
    mainImage?: string
    additionalImages?: string[]
    storeName?: string
    reviewCount?: number
    rating?: string
    purchaseCount?: number
    description?: string
    categories?: string[]
    options?: string[]
    deliveryInfo?: string
  }
  page: {
    title?: string
    metaDescription?: string
    metaKeywords?: string
    ogImage?: string
    detailImages?: string[]
    detailText?: string
    colors?: Array<{ color: string; count: number }>
    htmlSnapshot?: string
  }
  screenshot?: string
  capturedAt?: string
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

const ANALYSIS_PROMPT = `당신은 이커머스 가격 분석 전문가입니다. 상품의 가격 구조와 구성을 정밀하게 분석해주세요.

## 분석 항목

### 1. 상품 구성 파악
- 상품명과 옵션에서 실제 판매 단위 파악 (개수, 용량, 무게 등)
- 세트 구성인 경우 개별 구성품 파악
- 예: "닭가슴살 100g x 30팩" → 총 3kg

### 2. 단위당 가격 계산
- **kg당 가격**: 식품류의 경우 필수 계산
- **개당 가격**: 개별 포장 상품의 경우
- **ml당/L당 가격**: 음료/액체류의 경우
- **1회분당 가격**: 1회 섭취량 기준

### 3. 가격 전략 분석
- 묶음 할인 여부 및 할인율
- 대용량 vs 소용량 가격 차이
- 경쟁력 평가 (저가/중가/고가 포지셔닝)

### 4. 추가 비용 분석
- 배송비 (무료배송 조건 포함)
- 옵션별 추가금액
- 실질 총 비용 계산

### 5. 혜택 분석
- 적용 가능한 쿠폰/할인
- 적립금/포인트
- 카드사 혜택

반드시 JSON 형식으로 응답해주세요:
{
  "productComposition": {
    "productName": "상품명",
    "baseUnit": "기본 판매 단위 (예: 100g x 30팩)",
    "totalQuantity": "총 수량/용량 (예: 3kg, 30개)",
    "individualItems": ["개별 구성품 목록"],
    "servingSize": "1회 제공량 (해당시)"
  },
  "unitPricing": {
    "salePrice": 판매가(숫자),
    "originalPrice": 정가(숫자, 없으면 null),
    "discountRate": "할인율 (예: 30%)",
    "pricePerKg": "kg당 가격 (예: 9,900원/kg)",
    "pricePerUnit": "개당 가격 (예: 990원/개)",
    "pricePerServing": "1회분 가격 (해당시)",
    "pricePerMl": "ml당 가격 (음료류, 해당시)"
  },
  "shippingCost": {
    "baseFee": "기본 배송비",
    "freeShippingCondition": "무료배송 조건",
    "additionalFees": ["도서산간 등 추가비용"]
  },
  "optionAnalysis": {
    "availableOptions": [
      {
        "name": "옵션명",
        "price": 가격(숫자),
        "pricePerKg": "kg당 가격",
        "isBestValue": true/false
      }
    ],
    "bestValueOption": "가성비 최고 옵션",
    "optionPriceRange": "옵션 가격 범위 (최저~최고)"
  },
  "promotions": {
    "availableCoupons": ["적용 가능한 쿠폰들"],
    "pointsEarned": "적립 포인트",
    "cardBenefits": ["카드사 혜택"],
    "bundleDeals": "묶음 할인 정보"
  },
  "competitiveAnalysis": {
    "pricePosition": "가격 포지셔닝 (최저가/중저가/중가/프리미엄)",
    "valueForMoney": "가성비 평가 (1-5점)",
    "priceAdvantages": ["가격 경쟁력 요소"],
    "priceDisadvantages": ["가격 약점"]
  },
  "priceSummary": {
    "oneLiner": "한 줄 요약",
    "effectivePrice": "실질 구매가 (할인/쿠폰 적용 후)",
    "recommendation": "구매 추천 여부 및 이유"
  }
}`

export async function POST(request: NextRequest) {
  try {
    const payload: ExtensionPayload = await request.json()

    if (!payload.url || !payload.product) {
      return NextResponse.json(
        { error: 'Invalid payload: url and product data are required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to use this feature.' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const openai = await getOpenAIClient()
    
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in Settings.' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const { data: logData, error: logError } = await supabase
      .from('analysis_logs')
      .insert({
        user_id: userData.user.id,
        target_url: payload.url,
        target_platform: payload.platform || 'naver_smart_store',
        status: 'pending',
        analysis_result: {},
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create analysis log:', logError)
      return NextResponse.json(
        { error: 'Failed to create analysis log' },
        { status: 500, headers: corsHeaders() }
      )
    }

    const productContext = `
상품 정보:
- 상품명: ${payload.product.title || 'N/A'}
- 가격: ${payload.product.price?.toLocaleString() || 'N/A'}원
- 원가: ${payload.product.originalPrice?.toLocaleString() || 'N/A'}원
- 할인율: ${payload.product.discountRate || 'N/A'}
- 스토어: ${payload.product.storeName || 'N/A'}
- 리뷰 수: ${payload.product.reviewCount || 0}개
- 평점: ${payload.product.rating || 'N/A'}
- 구매 수: ${payload.product.purchaseCount || 0}건
- 카테고리: ${payload.product.categories?.join(' > ') || 'N/A'}
- 옵션: ${payload.product.options?.join(', ') || 'N/A'}
- 배송 정보: ${payload.product.deliveryInfo || 'N/A'}

페이지 메타 정보:
- 페이지 제목: ${payload.page.title || 'N/A'}
- 메타 설명: ${payload.page.metaDescription || 'N/A'}
- 키워드: ${payload.page.metaKeywords || 'N/A'}

색상 정보:
${payload.page.colors?.slice(0, 10).map(c => `- ${c.color}: ${c.count}회`).join('\n') || 'N/A'}

상세 페이지 텍스트 (일부):
${payload.page.detailText?.slice(0, 3000) || 'N/A'}
`

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert Korean e-commerce analyst. Always respond with valid JSON in Korean.',
      },
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\n${productContext}`,
      },
    ]

    if (payload.screenshot) {
      messages[1] = {
        role: 'user',
        content: [
          { type: 'text', text: `${ANALYSIS_PROMPT}\n\n${productContext}` },
          {
            type: 'image_url',
            image_url: {
              url: payload.screenshot,
              detail: 'high',
            },
          },
        ],
      }
    }

    const model = payload.screenshot ? 'gpt-4o' : 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 4000,
      temperature: 0.3,
    })

    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      await supabase
        .from('analysis_logs')
        .update({ status: 'failed' })
        .eq('id', logData.id)

      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500, headers: corsHeaders() }
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

    const fullResult = {
      analysis: analysisResult,
      extractedData: {
        product: payload.product,
        page: {
          ...payload.page,
          htmlSnapshot: undefined,
        },
      },
      analyzedAt: new Date().toISOString(),
      hasScreenshot: !!payload.screenshot,
    }

    await supabase
      .from('analysis_logs')
      .update({
        status: 'completed',
        analysis_result: fullResult as unknown as Json,
      })
      .eq('id', logData.id)

    const usage = completion.usage
    if (usage) {
      const costUsd = await calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      const costKrw = await formatCostKRW(costUsd)

      await recordAiUsage({
        usageType: 'benchmarking_structure',
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        metadata: { 
          url: payload.url,
          hasScreenshot: !!payload.screenshot,
          source: 'extension',
        },
      })

      return NextResponse.json({
        success: true,
        analysisId: logData.id,
        analysis: analysisResult,
        usage: {
          model,
          totalTokens: usage.total_tokens,
          costKrw,
        },
      }, { headers: corsHeaders() })
    }

    return NextResponse.json({
      success: true,
      analysisId: logData.id,
      analysis: analysisResult,
    }, { headers: corsHeaders() })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Extension analysis error:', error)
    return NextResponse.json(
      { error: `Analysis failed: ${errorMessage}` },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
