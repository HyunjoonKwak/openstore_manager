import { NextRequest, NextResponse } from 'next/server'
import { getCurrentNaverClient } from '@/lib/naver/current-client'

const COMMERCE_BASE = 'https://api.commerce.naver.com/external'

interface CommerceCategory {
  id: string
  name: string
  wholeCategoryName?: string
  last?: boolean
}

export async function GET(request: NextRequest) {
  const { client, error } = await getCurrentNaverClient()
  if (!client) return NextResponse.json({ message: error }, { status: 503 })

  const parentId = request.nextUrl.searchParams.get('parentId')?.trim()
  const path = parentId
    ? `/v1/categories/${encodeURIComponent(parentId)}/sub-categories`
    : '/v1/categories'

  try {
    const token = await client.getAccessToken()
    const response = await fetch(`${COMMERCE_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;charset=UTF-8' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const data = await response.json()
    if (!response.ok || !Array.isArray(data)) {
      return NextResponse.json(
        { message: data?.message || '네이버 카테고리를 불러오지 못했습니다.' },
        { status: response.status || 502 }
      )
    }

    const items = (data as CommerceCategory[])
      .filter((item) => item?.id && item?.name)
      .filter((item) => parentId || item.wholeCategoryName === item.name)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        wholeCategoryName: String(item.wholeCategoryName || item.name),
        last: Boolean(item.last),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, max-age=600' } })
  } catch (categoryError) {
    return NextResponse.json(
      { message: categoryError instanceof Error ? categoryError.message : '카테고리 요청에 실패했습니다.' },
      { status: 502 }
    )
  }
}
