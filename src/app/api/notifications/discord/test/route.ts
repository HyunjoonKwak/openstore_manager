import { NextRequest, NextResponse } from 'next/server'
import { sendDiscordWebhook } from '@/lib/notifications/discord'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { webhookUrl } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: '웹훅 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    const result = await sendDiscordWebhook({
      webhookUrl,
      message: `**[테스트 메시지]**\n\nDiscord 알림 설정이 정상적으로 완료되었습니다.\n주문 동기화 시 신규 주문, 취소 요청 등의 알림을 받을 수 있습니다.\n\n📍 스토어매니저`,
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Discord test webhook error:', error)
    return NextResponse.json(
      { success: false, error: '테스트 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
