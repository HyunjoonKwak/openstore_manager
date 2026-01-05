import { NextResponse } from 'next/server'
import { getNotificationStatus } from '@/lib/notifications'

export async function GET() {
  const status = await getNotificationStatus()
  return NextResponse.json(status)
}
