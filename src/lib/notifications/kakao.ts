'use server'

interface KakaoConfig {
  apiKey: string
  senderId: string
  templateId: string
}

interface SendKakaoParams {
  to: string
  templateData: Record<string, string>
}

interface SendKakaoResult {
  success: boolean
  messageId?: string
  error?: string
}

function getConfig(): KakaoConfig | null {
  const apiKey = process.env.KAKAO_ALIMTALK_API_KEY
  const senderId = process.env.KAKAO_ALIMTALK_SENDER_ID
  const templateId = process.env.KAKAO_ALIMTALK_TEMPLATE_ID

  if (!apiKey || !senderId || !templateId) {
    return null
  }

  return { apiKey, senderId, templateId }
}

export async function sendKakaoAlimtalk(params: SendKakaoParams): Promise<SendKakaoResult> {
  const config = getConfig()
  
  if (!config) {
    return { 
      success: false, 
      error: '카카오 알림톡 설정이 완료되지 않았습니다. 환경변수를 확인하세요.' 
    }
  }

  const phoneNumber = params.to.replace(/[^0-9]/g, '')
  if (!phoneNumber || phoneNumber.length < 10) {
    return { success: false, error: '올바른 전화번호 형식이 아닙니다.' }
  }

  try {
    const response = await fetch('https://api.solapi.com/kakao/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [{
          to: phoneNumber,
          from: config.senderId,
          kakaoOptions: {
            pfId: config.senderId,
            templateId: config.templateId,
            variables: params.templateData,
          },
        }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: errorData.message || `알림톡 발송 실패: ${response.status}` 
      }
    }

    const data = await response.json()
    return { 
      success: true, 
      messageId: data.messageId 
    }
  } catch (error) {
    console.error('[Kakao Alimtalk] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알림톡 발송 중 오류가 발생했습니다.' 
    }
  }
}

export async function sendOrderNotificationKakao(params: {
  supplierName: string
  supplierPhone: string
  orderCount: number
  productSummary: string
  totalAmount: number
}): Promise<SendKakaoResult> {
  return sendKakaoAlimtalk({
    to: params.supplierPhone,
    templateData: {
      supplierName: params.supplierName,
      orderCount: String(params.orderCount),
      productSummary: params.productSummary,
      totalAmount: new Intl.NumberFormat('ko-KR').format(params.totalAmount),
    },
  })
}

export async function isKakaoConfigured(): Promise<boolean> {
  return getConfig() !== null
}
