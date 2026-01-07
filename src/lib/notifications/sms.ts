'use server'

import crypto from 'crypto'

interface SMSConfig {
  apiKey: string
  apiSecret: string
  senderId: string
}

interface SendSMSParams {
  to: string
  message: string
}

interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

function getConfig(): SMSConfig | null {
  const apiKey = process.env.COOLSMS_API_KEY
  const apiSecret = process.env.COOLSMS_API_SECRET
  const senderId = process.env.COOLSMS_SENDER_ID

  if (!apiKey || !apiSecret || !senderId) {
    return null
  }

  return { apiKey, apiSecret, senderId }
}

function generateSignature(_apiKey: string, apiSecret: string, timestamp: string): string {
  const message = timestamp + apiSecret
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex')
}

export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const config = getConfig()
  
  if (!config) {
    return { 
      success: false, 
      error: 'SMS 설정이 완료되지 않았습니다. 환경변수를 확인하세요.' 
    }
  }

  const phoneNumber = params.to.replace(/[^0-9]/g, '')
  if (!phoneNumber || phoneNumber.length < 10) {
    return { success: false, error: '올바른 전화번호 형식이 아닙니다.' }
  }

  const timestamp = new Date().toISOString()
  const signature = generateSignature(config.apiKey, config.apiSecret, timestamp)

  try {
    const response = await fetch('https://api.coolsms.co.kr/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${config.apiKey}, date=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phoneNumber,
          from: config.senderId,
          text: params.message,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: errorData.message || `SMS 발송 실패: ${response.status}` 
      }
    }

    const data = await response.json()
    return { 
      success: true, 
      messageId: data.messageId 
    }
  } catch (error) {
    console.error('[SMS] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SMS 발송 중 오류가 발생했습니다.' 
    }
  }
}

export async function sendOrderNotificationSMS(params: {
  supplierName: string
  supplierPhone: string
  orderCount: number
  productSummary: string
}): Promise<SendSMSResult> {
  const message = `[스마트스토어 주문알림]
${params.supplierName}님, 새 주문 ${params.orderCount}건이 접수되었습니다.

${params.productSummary}

스토어매니저에서 확인해주세요.`

  return sendSMS({
    to: params.supplierPhone,
    message: message.slice(0, 90),
  })
}

export async function isSMSConfigured(): Promise<boolean> {
  return getConfig() !== null
}
