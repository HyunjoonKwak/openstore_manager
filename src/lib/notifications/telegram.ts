'use server'

interface SendTelegramResult {
  success: boolean
  messageId?: number
  error?: string
}

interface SendTelegramParams {
  webhookUrl: string
  message: string
}

/**
 * Parse Telegram webhook URL to extract bot token and chat ID
 * Expected format: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
 * Or simple webhook URL that will be called directly
 */
function parseTelegramUrl(webhookUrl: string): { botToken: string; chatId: string } | null {
  try {
    const url = new URL(webhookUrl)
    
    if (url.hostname === 'api.telegram.org') {
      const pathMatch = url.pathname.match(/^\/bot([^/]+)\//)
      if (pathMatch) {
        const botToken = pathMatch[1]
        const chatId = url.searchParams.get('chat_id')
        if (botToken && chatId) {
          return { botToken, chatId }
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

export async function sendTelegramWebhook(params: SendTelegramParams): Promise<SendTelegramResult> {
  const { webhookUrl, message } = params

  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    return {
      success: false,
      error: '유효한 웹훅 URL이 아닙니다. https://로 시작하는 URL을 입력하세요.',
    }
  }

  try {
    const parsed = parseTelegramUrl(webhookUrl)
    
    if (parsed) {
      const response = await fetch(`https://api.telegram.org/bot${parsed.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: parsed.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `Telegram 전송 실패: ${response.status}`,
        }
      }

      return {
        success: true,
        messageId: data.result?.message_id,
      }
    } else {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          message: message,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        return {
          success: false,
          error: `웹훅 전송 실패: ${response.status} ${errorText}`.trim(),
        }
      }

      return { success: true }
    }
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Telegram 웹훅 전송 중 오류가 발생했습니다.',
    }
  }
}

export async function sendOrderNotificationTelegram(params: {
  webhookUrl: string
  supplierName: string
  orderCount: number
  productSummary: string
  totalAmount: number
}): Promise<SendTelegramResult> {
  const message = `<b>[스마트스토어 주문알림]</b>

${params.supplierName}님, 새 주문 <b>${params.orderCount}건</b>이 접수되었습니다.

<b>주문 내역:</b>
${params.productSummary}

<b>총 금액:</b> ${new Intl.NumberFormat('ko-KR').format(params.totalAmount)}원

스토어매니저에서 확인해주세요.`

  return sendTelegramWebhook({
    webhookUrl: params.webhookUrl,
    message,
  })
}
