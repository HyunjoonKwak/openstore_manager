import { sendDiscordWebhook } from './discord'

export type AlertType = 'NEW_ORDER' | 'CANCEL_REQUEST' | 'CANCEL_DONE' | 'DELIVERY_COMPLETE' | 'INQUIRY'

interface AlertConfig {
  emoji: string
  title: string
  color: string
}

const ALERT_CONFIG: Record<AlertType, AlertConfig> = {
  NEW_ORDER: { emoji: '🛒', title: '신규 주문', color: '#22c55e' },
  CANCEL_REQUEST: { emoji: '⚠️', title: '취소 요청', color: '#f59e0b' },
  CANCEL_DONE: { emoji: '❌', title: '취소 완료', color: '#ef4444' },
  DELIVERY_COMPLETE: { emoji: '📦', title: '배송 완료', color: '#3b82f6' },
  INQUIRY: { emoji: '💬', title: '새 문의', color: '#8b5cf6' },
}

interface OrderAlertParams {
  type: AlertType
  orders: {
    orderId: string
    productName: string
    quantity: number
    customerName: string
    amount?: number
  }[]
}

interface InquiryAlertParams {
  type: 'INQUIRY'
  inquiryCount: number
  qnaCount: number
}

function formatOrderAlert(params: OrderAlertParams): string {
  const config = ALERT_CONFIG[params.type]
  const orderCount = params.orders.length
  
  let message = `${config.emoji} **[${config.title}]** ${orderCount}건\n\n`
  
  for (const order of params.orders.slice(0, 5)) {
    const amount = order.amount 
      ? ` (${new Intl.NumberFormat('ko-KR').format(order.amount)}원)`
      : ''
    message += `• ${order.productName} x${order.quantity}${amount}\n`
    message += `  주문번호: ${order.orderId} / ${order.customerName}\n`
  }
  
  if (orderCount > 5) {
    message += `\n... 외 ${orderCount - 5}건`
  }
  
  message += `\n\n📍 스토어매니저에서 확인하세요.`
  
  return message
}

function formatInquiryAlert(params: InquiryAlertParams): string {
  const config = ALERT_CONFIG.INQUIRY
  
  let message = `${config.emoji} **[${config.title}]**\n\n`
  
  if (params.inquiryCount > 0) {
    message += `• 미답변 고객문의: ${params.inquiryCount}건\n`
  }
  if (params.qnaCount > 0) {
    message += `• 미답변 상품문의: ${params.qnaCount}건\n`
  }
  
  message += `\n📍 스토어매니저에서 확인하세요.`
  
  return message
}

function formatSyncSummaryAlert(summary: {
  newOrders: number
  cancelRequests: number
  deliveryComplete: number
}): string | null {
  const parts: string[] = []
  
  if (summary.newOrders > 0) {
    parts.push(`🛒 신규주문 ${summary.newOrders}건`)
  }
  if (summary.cancelRequests > 0) {
    parts.push(`⚠️ 취소요청 ${summary.cancelRequests}건`)
  }
  if (summary.deliveryComplete > 0) {
    parts.push(`📦 배송완료 ${summary.deliveryComplete}건`)
  }
  
  if (parts.length === 0) return null
  
  return `**[주문 동기화 알림]**\n\n${parts.join('\n')}\n\n📍 스토어매니저에서 확인하세요.`
}

export async function sendStoreAlert(params: {
  webhookUrl: string
  alertType: AlertType
  orders: OrderAlertParams['orders']
}): Promise<{ success: boolean; error?: string }> {
  const message = formatOrderAlert({
    type: params.alertType,
    orders: params.orders,
  })
  
  return sendDiscordWebhook({
    webhookUrl: params.webhookUrl,
    message,
  })
}

export async function sendSyncSummaryAlert(params: {
  webhookUrl: string
  summary: {
    newOrders: number
    cancelRequests: number
    deliveryComplete: number
  }
}): Promise<{ success: boolean; error?: string }> {
  const message = formatSyncSummaryAlert(params.summary)
  
  if (!message) {
    return { success: true }
  }
  
  return sendDiscordWebhook({
    webhookUrl: params.webhookUrl,
    message,
  })
}
