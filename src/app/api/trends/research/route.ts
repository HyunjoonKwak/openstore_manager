import { NextResponse } from 'next/server'
import { apiHubPost } from '@/lib/naver/api-hub'

interface TrendRequest {
  keywords?: string[]
  categoryId?: string
  days?: number
}

function dateText(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  let input: TrendRequest
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ message: '트렌드 요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const keywords = Array.from(new Set(
    (input.keywords || []).map((value) => String(value).trim()).filter((value) => value.length >= 2)
  )).slice(0, 5)
  if (keywords.length < 2) {
    return NextResponse.json({ message: '비교할 검색어를 2개 이상 입력해주세요.' }, { status: 400 })
  }

  const days = Math.min(180, Math.max(14, Number(input.days) || 30))
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 86_400_000)
  const common = { startDate: dateText(start), endDate: dateText(end), timeUnit: 'date' }

  try {
    const searchPromise = apiHubPost('/search-trend/v1/search', {
      ...common,
      keywordGroups: keywords.map((keyword) => ({ groupName: keyword, keywords: [keyword] })),
    })

    const shoppingPromise = input.categoryId && /^\d+$/.test(input.categoryId)
      ? apiHubPost('/shopping/v1/category/keywords', {
          ...common,
          category: input.categoryId,
          keyword: keywords.map((keyword) => ({ name: keyword, param: [keyword] })),
        })
      : Promise.resolve(null)

    const devicePromise = input.categoryId && /^\d+$/.test(input.categoryId)
      ? apiHubPost('/shopping/v1/category/keyword/device', {
          ...common,
          category: input.categoryId,
          keyword: keywords[0],
        })
      : Promise.resolve(null)

    const [search, shopping, device] = await Promise.all([searchPromise, shoppingPromise, devicePromise])
    return NextResponse.json({ search, shopping, device, period: common })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '트렌드 데이터를 가져오지 못했습니다.' },
      { status: 502 }
    )
  }
}
