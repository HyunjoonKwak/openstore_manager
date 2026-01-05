'use server'

interface SendDiscordResult {
  success: boolean
  error?: string
}

interface SendDiscordParams {
  webhookUrl: string
  message: string
}

export async function sendDiscordWebhook(params: SendDiscordParams): Promise<SendDiscordResult> {
  const { webhookUrl, message } = params

  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    return {
      success: false,
      error: '유효한 웹훅 URL이 아닙니다. https://로 시작하는 URL을 입력하세요.',
    }
  }

  if (!webhookUrl.includes('discord.com/api/webhooks/')) {
    return {
      success: false,
      error: '유효한 Discord 웹훅 URL이 아닙니다.',
    }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `Discord 전송 실패: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Discord Webhook] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Discord 웹훅 전송 중 오류가 발생했습니다.',
    }
  }
}

export async function sendOrderNotificationDiscord(params: {
  webhookUrl: string
  supplierName: string
  orderCount: number
  productSummary: string
  totalAmount: number
}): Promise<SendDiscordResult> {
  const message = `**[스마트스토어 주문알림]**

${params.supplierName}님, 새 주문 **${params.orderCount}건**이 접수되었습니다.

**주문 내역:**
${params.productSummary}

**총 금액:** ${new Intl.NumberFormat('ko-KR').format(params.totalAmount)}원

스토어매니저에서 확인해주세요.`

  return sendDiscordWebhook({
    webhookUrl: params.webhookUrl,
    message,
  })
}
