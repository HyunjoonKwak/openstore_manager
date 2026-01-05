import { NextRequest, NextResponse } from 'next/server'
import { scrapeWithPlaywright, scrapeWithCheerio, validateUrl } from '@/lib/scraper/playwright-scraper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, scrape = false } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const validation = validateUrl(url)
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          isValid: false, 
          error: validation.error,
          platform: null,
        },
        { status: 400 }
      )
    }

    if (scrape) {
      let result = await scrapeWithCheerio(url)
      
      if (!result.success || result.isBlocked) {
        result = await scrapeWithPlaywright(url)
      }
      
      if (!result.success) {
        const errorMessage = result.isBlocked 
          ? '네이버에서 접근을 차단했습니다. 네이버 스마트스토어는 자동화된 접근을 제한하고 있어 분석이 어렵습니다. 잠시 후 다시 시도하거나, 상품 URL을 복사하여 직접 페이지 내용을 확인해주세요.'
          : result.error
        
        return NextResponse.json(
          { 
            isValid: true,
            platform: validation.platform,
            error: errorMessage,
            isBlocked: result.isBlocked || false,
            content: null,
            method: result.method,
          },
          { status: result.isBlocked ? 403 : 500 }
        )
      }

      return NextResponse.json({
        isValid: true,
        platform: validation.platform,
        content: result.content,
        method: result.method,
      })
    }

    return NextResponse.json({
      isValid: true,
      platform: validation.platform,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Invalid request: ${errorMessage}` },
      { status: 400 }
    )
  }
}
