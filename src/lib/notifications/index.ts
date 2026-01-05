'use server'

import { sendOrderNotificationSMS, isSMSConfigured } from './sms'
import { sendOrderNotificationKakao, isKakaoConfigured } from './kakao'
import { sendOrderNotificationTelegram } from './telegram'
import { sendOrderNotificationDiscord } from './discord'
import type { ContactMethod } from '@/types/database.types'

export interface OrderNotificationParams {
  supplierName: string
  supplierPhone?: string
  webhookUrl?: string
  contactMethod: ContactMethod
  orderCount: number
  productSummary: string
  totalAmount: number
}

export interface NotificationResult {
  success: boolean
  method: ContactMethod
  error?: string
}

export async function sendOrderNotification(params: OrderNotificationParams): Promise<NotificationResult> {
  const { contactMethod } = params

  if (contactMethod === 'Telegram') {
    if (!params.webhookUrl) {
      return {
        success: false,
        method: 'Telegram',
        error: 'Telegram 웹훅 URL이 설정되지 않았습니다.',
      }
    }
    const result = await sendOrderNotificationTelegram({
      webhookUrl: params.webhookUrl,
      supplierName: params.supplierName,
      orderCount: params.orderCount,
      productSummary: params.productSummary,
      totalAmount: params.totalAmount,
    })
    return {
      success: result.success,
      method: 'Telegram',
      error: result.error,
    }
  }

  if (contactMethod === 'Discord') {
    if (!params.webhookUrl) {
      return {
        success: false,
        method: 'Discord',
        error: 'Discord 웹훅 URL이 설정되지 않았습니다.',
      }
    }
    const result = await sendOrderNotificationDiscord({
      webhookUrl: params.webhookUrl,
      supplierName: params.supplierName,
      orderCount: params.orderCount,
      productSummary: params.productSummary,
      totalAmount: params.totalAmount,
    })
    return {
      success: result.success,
      method: 'Discord',
      error: result.error,
    }
  }

  if (contactMethod === 'Kakao') {
    if (!params.supplierPhone) {
      return {
        success: false,
        method: 'Kakao',
        error: '공급업체 전화번호가 설정되지 않았습니다.',
      }
    }
    const isConfigured = await isKakaoConfigured()
    if (!isConfigured) {
      const smsConfigured = await isSMSConfigured()
      if (smsConfigured) {
        const result = await sendOrderNotificationSMS({
          supplierName: params.supplierName,
          supplierPhone: params.supplierPhone,
          orderCount: params.orderCount,
          productSummary: params.productSummary,
        })
        return { 
          success: result.success, 
          method: 'SMS',
          error: result.error 
        }
      }
      return { 
        success: false, 
        method: 'Kakao',
        error: '카카오 알림톡 설정이 완료되지 않았습니다.' 
      }
    }

    const result = await sendOrderNotificationKakao({
      supplierName: params.supplierName,
      supplierPhone: params.supplierPhone,
      orderCount: params.orderCount,
      productSummary: params.productSummary,
      totalAmount: params.totalAmount,
    })
    return { 
      success: result.success, 
      method: 'Kakao',
      error: result.error 
    }
  }

  if (!params.supplierPhone) {
    return {
      success: false,
      method: 'SMS',
      error: '공급업체 전화번호가 설정되지 않았습니다.',
    }
  }

  const isConfigured = await isSMSConfigured()
  if (!isConfigured) {
    return { 
      success: false, 
      method: 'SMS',
      error: 'SMS 설정이 완료되지 않았습니다.' 
    }
  }

  const result = await sendOrderNotificationSMS({
    supplierName: params.supplierName,
    supplierPhone: params.supplierPhone,
    orderCount: params.orderCount,
    productSummary: params.productSummary,
  })
  return { 
    success: result.success, 
    method: 'SMS',
    error: result.error 
  }
}

export async function getNotificationStatus(): Promise<{
  smsConfigured: boolean
  kakaoConfigured: boolean
}> {
  const [smsConfigured, kakaoConfigured] = await Promise.all([
    isSMSConfigured(),
    isKakaoConfigured(),
  ])
  return { smsConfigured, kakaoConfigured }
}

export interface TestNotificationParams {
  supplierName: string
  contactMethod: ContactMethod
  contactNumber?: string
  webhookUrl?: string
  messageTemplate: string
}

function renderTestTemplate(template: string, supplierName: string): string {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return template
    .replace(/{supplier_name}/g, supplierName)
    .replace(/{date}/g, today)
    .replace(/{order_count}/g, '3')
    .replace(/{total_quantity}/g, '7')
    .replace(/{total_amount}/g, '150,000')
    .replace(/{order_list}/g, '- 테스트 상품A (옵션1) x3\n- 테스트 상품B x2\n- 테스트 상품C (Large) x2')
    .replace(/{receiver_list}/g, '1. 홍길동 / 010-1234-5678\n   서울시 강남구 테헤란로 123\n2. 김철수 / 010-9876-5432\n   부산시 해운대구 해변로 456')
}

export async function sendTestNotification(params: TestNotificationParams): Promise<NotificationResult> {
  const { contactMethod, messageTemplate, supplierName } = params
  const renderedMessage = renderTestTemplate(messageTemplate, supplierName)

  if (contactMethod === 'Telegram') {
    if (!params.webhookUrl) {
      return {
        success: false,
        method: 'Telegram',
        error: 'Telegram 웹훅 URL이 설정되지 않았습니다.',
      }
    }
    const { sendTelegramWebhook } = await import('./telegram')
    const result = await sendTelegramWebhook({
      webhookUrl: params.webhookUrl,
      message: renderedMessage,
    })
    return {
      success: result.success,
      method: 'Telegram',
      error: result.error,
    }
  }

  if (contactMethod === 'Discord') {
    if (!params.webhookUrl) {
      return {
        success: false,
        method: 'Discord',
        error: 'Discord 웹훅 URL이 설정되지 않았습니다.',
      }
    }
    const { sendDiscordWebhook } = await import('./discord')
    const result = await sendDiscordWebhook({
      webhookUrl: params.webhookUrl,
      message: renderedMessage,
    })
    return {
      success: result.success,
      method: 'Discord',
      error: result.error,
    }
  }

  if (contactMethod === 'Kakao') {
    if (!params.contactNumber) {
      return {
        success: false,
        method: 'Kakao',
        error: '연락처가 설정되지 않았습니다.',
      }
    }
    const isConfigured = await isKakaoConfigured()
    if (!isConfigured) {
      const smsConfigured = await isSMSConfigured()
      if (smsConfigured) {
        const { sendSMS } = await import('./sms')
        const result = await sendSMS({
          to: params.contactNumber,
          message: renderedMessage.slice(0, 90),
        })
        return {
          success: result.success,
          method: 'SMS',
          error: result.error,
        }
      }
      return {
        success: false,
        method: 'Kakao',
        error: '카카오 알림톡 설정이 완료되지 않았습니다.',
      }
    }
    return {
      success: false,
      method: 'Kakao',
      error: '카카오 알림톡 테스트 발송은 지원되지 않습니다. SMS로 테스트해주세요.',
    }
  }

  if (!params.contactNumber) {
    return {
      success: false,
      method: 'SMS',
      error: '연락처가 설정되지 않았습니다.',
    }
  }

  const isConfigured = await isSMSConfigured()
  if (!isConfigured) {
    return {
      success: false,
      method: 'SMS',
      error: 'SMS 설정이 완료되지 않았습니다.',
    }
  }

  const { sendSMS } = await import('./sms')
  const result = await sendSMS({
    to: params.contactNumber,
    message: renderedMessage.slice(0, 90),
  })
  return {
    success: result.success,
    method: 'SMS',
    error: result.error,
  }
}
