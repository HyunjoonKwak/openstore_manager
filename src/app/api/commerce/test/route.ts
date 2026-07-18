import { NextResponse } from 'next/server'
import { formatCommerceError, getCurrentNaverClient } from '@/lib/naver/current-client'

export async function POST() {
  const { client, error } = await getCurrentNaverClient()
  if (!client) return NextResponse.json({ message: error }, { status: 503 })

  try {
    await client.getAccessToken()
    return NextResponse.json({ connected: true })
  } catch (connectionError) {
    return NextResponse.json(
      { message: formatCommerceError(connectionError, '네이버 인증에 실패했습니다.') },
      { status: 502 }
    )
  }
}
