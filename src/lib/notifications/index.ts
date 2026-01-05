'use server'

import { sendOrderNotificationSMS, isSMSConfigured } from './sms'
import { sendOrderNotificationKakao, isKakaoConfigured } from './kakao'
import type { ContactMethod } from '@/types/database.types'

export interface OrderNotificationParams {
  supplierName: string
  supplierPhone: string
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

  if (contactMethod === 'Kakao') {
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
