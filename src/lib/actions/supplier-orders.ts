'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderStatus, ContactMethod } from '@/types/database.types'
import { sendOrderNotification, getNotificationStatus } from '@/lib/notifications'

export interface OrderForSupplier {
  id: string
  platformOrderId: string
  productName: string
  productSku: string
  productOption: string | null
  quantity: number
  customerName: string
  customerAddress: string
  receiverName: string | null
  totalAmount: number | null
  orderDate: string
  supplierId: string | null
  supplierName: string | null
}

export interface SupplierForOrder {
  id: string
  name: string
  contactNumber: string | null
  webhookUrl: string | null
  contactMethod: ContactMethod
  messageTemplate: string | null
  sendScheduleTime: string | null
  sendScheduleEnabled: boolean
  autoSendEnabled: boolean
}

interface OrderRow {
  id: string
  platform_order_id: string | null
  quantity: number
  customer_name: string | null
  customer_address: string | null
  order_date: string
  product_option: string | null
  receiver_name: string | null
  product_name: string | null
  supplier_id: string | null
  total_payment_amount: number | null
  products: {
    id: string
    name: string
    sku: string | null
    supplier_id: string | null
    suppliers: { id: string; name: string } | null
  } | null
}

export async function getOrdersForSupplierSend(
  status: OrderStatus = 'New'
): Promise<{ data: OrderForSupplier[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: [], error: null }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      platform_order_id,
      quantity,
      customer_name,
      customer_address,
      order_date,
      product_name,
      product_option,
      receiver_name,
      supplier_id,
      total_payment_amount,
      products (
        id,
        name,
        sku,
        supplier_id,
        suppliers (id, name)
      )
    `)
    .in('store_id', storeIds)
    .eq('status', status)
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedOrders = orders as unknown as OrderRow[]

  const transformedOrders: OrderForSupplier[] = typedOrders.map((order) => ({
    id: order.id,
    platformOrderId: order.platform_order_id || order.id.slice(0, 8).toUpperCase(),
    productName: order.product_name || order.products?.name || 'Unknown Product',
    productSku: order.products?.sku || 'N/A',
    productOption: order.product_option || null,
    quantity: order.quantity,
    customerName: order.customer_name || 'Unknown',
    customerAddress: order.customer_address || '',
    receiverName: order.receiver_name || null,
    totalAmount: order.total_payment_amount || null,
    orderDate: order.order_date,
    supplierId: order.supplier_id || order.products?.supplier_id || null,
    supplierName: order.products?.suppliers?.name || null,
  }))

  return { data: transformedOrders, error: null }
}

export async function getOrdersBySupplier(
  supplierId: string,
  status: OrderStatus = 'New'
): Promise<{ data: OrderForSupplier[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: [], error: null }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('supplier_id', supplierId)

  if (!products || products.length === 0) {
    return { data: [], error: null }
  }

  const productIds = products.map((p) => p.id)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      platform_order_id,
      quantity,
      customer_name,
      customer_address,
      order_date,
      product_name,
      product_option,
      receiver_name,
      supplier_id,
      total_payment_amount,
      products (
        id,
        name,
        sku,
        supplier_id,
        suppliers (id, name)
      )
    `)
    .in('store_id', storeIds)
    .in('product_id', productIds)
    .eq('status', status)
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedOrders = orders as unknown as OrderRow[]

  const transformedOrders: OrderForSupplier[] = typedOrders.map((order) => ({
    id: order.id,
    platformOrderId: order.platform_order_id || order.id.slice(0, 8).toUpperCase(),
    productName: order.product_name || order.products?.name || 'Unknown Product',
    productSku: order.products?.sku || 'N/A',
    productOption: order.product_option || null,
    quantity: order.quantity,
    customerName: order.customer_name || 'Unknown',
    customerAddress: order.customer_address || '',
    receiverName: order.receiver_name || null,
    totalAmount: order.total_payment_amount || null,
    orderDate: order.order_date,
    supplierId: order.supplier_id || order.products?.supplier_id || null,
    supplierName: order.products?.suppliers?.name || null,
  }))

  return { data: transformedOrders, error: null }
}

export async function getSuppliersForOrders(): Promise<{
  data: SupplierForOrder[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_number, webhook_url, contact_method, message_template, send_schedule_time, send_schedule_enabled, auto_send_enabled')
    .eq('user_id', userData.user.id)
    .order('name')

  if (error) {
    return { data: null, error: error.message }
  }

  interface SupplierRow {
    id: string
    name: string
    contact_number: string | null
    webhook_url: string | null
    contact_method: string
    message_template: string | null
    send_schedule_time: string | null
    send_schedule_enabled: boolean
    auto_send_enabled: boolean
  }

  const typedSuppliers = suppliers as unknown as SupplierRow[]

  return {
    data: typedSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactNumber: s.contact_number,
      webhookUrl: s.webhook_url,
      contactMethod: s.contact_method as ContactMethod,
      messageTemplate: s.message_template,
      sendScheduleTime: s.send_schedule_time,
      sendScheduleEnabled: s.send_schedule_enabled ?? false,
      autoSendEnabled: s.auto_send_enabled ?? false,
    })),
    error: null,
  }
}

export async function generateOrderMessage(
  orders: OrderForSupplier[],
  supplier: SupplierForOrder
): Promise<string> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const orderLines = orders
    .map((order, index) => {
      return `${index + 1}. [${order.productSku}] ${order.productName}
   - 수량: ${order.quantity}개
   - 주문번호: ${order.platformOrderId}
   - 받는분: ${order.customerName}
   - 주소: ${order.customerAddress || '(주소 없음)'}`
    })
    .join('\n\n')

  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)

  return `[발주 요청] ${today}

안녕하세요, ${supplier.name} 담당자님.

아래와 같이 발주 요청드립니다.

========================================
${orderLines}
========================================

총 ${orders.length}건, ${totalQuantity}개

빠른 처리 부탁드립니다.
감사합니다.`
}

export async function markOrdersAsOrdered(
  orderIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'Ordered' as OrderStatus })
    .in('id', orderIds)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/orders')
  revalidatePath('/orders/send')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

export async function getOrdersGroupedBySupplier(
  status: OrderStatus = 'New'
): Promise<{
  data: Map<string, { supplier: SupplierForOrder | null; orders: OrderForSupplier[] }> | null
  error: string | null
}> {
  const ordersResult = await getOrdersForSupplierSend(status)
  if (ordersResult.error || !ordersResult.data) {
    return { data: null, error: ordersResult.error }
  }

  const suppliersResult = await getSuppliersForOrders()
  if (suppliersResult.error) {
    return { data: null, error: suppliersResult.error }
  }

  const suppliersMap = new Map<string, SupplierForOrder>()
  suppliersResult.data?.forEach((s) => suppliersMap.set(s.id, s))

  const grouped = new Map<string, { supplier: SupplierForOrder | null; orders: OrderForSupplier[] }>()

  ordersResult.data.forEach((order) => {
    const key = order.supplierId || 'unassigned'
    if (!grouped.has(key)) {
      grouped.set(key, {
        supplier: order.supplierId ? suppliersMap.get(order.supplierId) || null : null,
        orders: [],
      })
    }
    grouped.get(key)!.orders.push(order)
  })

  return { data: grouped, error: null }
}

export interface SendOrdersToSupplierResult {
  success: boolean
  orderCount: number
  notificationSent: boolean
  notificationMethod?: ContactMethod
  notificationError?: string
  error?: string
}

export async function sendOrdersToSupplier(
  supplierId: string,
  orderIds: string[],
  sendNotification: boolean = true
): Promise<SendOrdersToSupplierResult> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, orderCount: 0, notificationSent: false, error: 'Unauthorized' }
  }

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name, contact_number, webhook_url, contact_method')
    .eq('id', supplierId)
    .single()

  if (!supplier) {
    return { success: false, orderCount: 0, notificationSent: false, error: '공급업체를 찾을 수 없습니다.' }
  }

  interface SupplierRow {
    id: string
    name: string
    contact_number: string | null
    webhook_url: string | null
    contact_method: string
  }
  const typedSupplier = supplier as unknown as SupplierRow

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'Ordered' as OrderStatus })
    .in('id', orderIds)

  if (updateError) {
    return { success: false, orderCount: 0, notificationSent: false, error: updateError.message }
  }

  let notificationSent = false
  let notificationMethod: ContactMethod | undefined
  let notificationError: string | undefined

  const isWebhookMethod = typedSupplier.contact_method === 'Telegram' || typedSupplier.contact_method === 'Discord'
  const canSendNotification = isWebhookMethod ? !!typedSupplier.webhook_url : !!typedSupplier.contact_number

  if (sendNotification && canSendNotification) {
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        quantity,
        total_payment_amount,
        products (name)
      `)
      .in('id', orderIds)

    interface OrderWithProduct {
      id: string
      quantity: number
      total_payment_amount: number | null
      products: { name: string } | null
    }
    const typedOrders = (orders || []) as unknown as OrderWithProduct[]

    const productSummary = typedOrders
      .slice(0, 3)
      .map(o => `${o.products?.name || '상품'} x${o.quantity}`)
      .join(', ')
      + (typedOrders.length > 3 ? ` 외 ${typedOrders.length - 3}건` : '')

    const totalAmount = typedOrders.reduce((sum, o) => sum + (o.total_payment_amount || 0), 0)

    const result = await sendOrderNotification({
      supplierName: typedSupplier.name,
      supplierPhone: typedSupplier.contact_number ?? undefined,
      webhookUrl: typedSupplier.webhook_url ?? undefined,
      contactMethod: typedSupplier.contact_method as ContactMethod,
      orderCount: orderIds.length,
      productSummary,
      totalAmount,
    })

    notificationSent = result.success
    notificationMethod = result.method
    notificationError = result.error
  }

  revalidatePath('/orders')
  revalidatePath('/orders/send')
  revalidatePath('/dashboard')

  return {
    success: true,
    orderCount: orderIds.length,
    notificationSent,
    notificationMethod,
    notificationError,
  }
}

export async function checkNotificationConfig(): Promise<{
  smsConfigured: boolean
  kakaoConfigured: boolean
}> {
  return getNotificationStatus()
}
