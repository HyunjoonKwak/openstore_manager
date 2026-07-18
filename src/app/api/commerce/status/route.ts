import { NextResponse } from 'next/server'
import { getCurrentNaverClient } from '@/lib/naver/current-client'

export async function GET() {
  const result = await getCurrentNaverClient()
  return NextResponse.json({
    configured: result.configured,
    message: result.error,
  })
}
