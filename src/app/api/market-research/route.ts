import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SEARCH_ENDPOINT = 'https://k-skill-proxy.nomadamas.org/v1/naver-shopping/search'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('q')?.trim() || ''
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 20)
  const limit = Math.min(40, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20))

  if (query.length < 2) {
    return NextResponse.json({ message: '검색어는 두 글자 이상이어야 합니다.' }, { status: 400 })
  }

  const endpoint = new URL(SEARCH_ENDPOINT)
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('limit', String(limit))
  endpoint.searchParams.set('sort', 'rel')

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || '상품 검색 서비스가 응답하지 않았습니다.' },
        { status: response.status }
      )
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch {
    return NextResponse.json(
      { message: '시장 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 }
    )
  }
}
