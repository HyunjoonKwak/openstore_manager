'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/types/database.types'
import { parseError, formatErrorMessage } from '@/lib/error-messages'

export interface OrderWithProduct {
  id: string
  platformOrderId: string
  naverOrderId?: string
  product: {
    id: string
    name: string
    sku: string
    price: number
    option?: string
  }
  customer: {
    name: string
    initials: string
    color: string
    tel?: string
  }
  receiver?: {
    name: string
    tel: string
    address: string
    zipCode: string
    memo?: string
  }
  date: string
  total: number
  unitPrice?: number
  quantity: number
  status: OrderStatus
  naverStatus?: string
  trackingNumber: string | null
  courierCode: string | null
}

const avatarColors = [
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-600',
  'bg-purple-500',
  'bg-rose-500',
  'bg-emerald-500',
]

function getInitials(name: string): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  if (!name) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

interface OrderRow {
  id: string
  platform_order_id: string | null
  naver_order_id: string | null
  product_id: string | null
  quantity: number
  customer_name: string | null
  orderer_tel: string | null
  status: string
  naver_order_status: string | null
  tracking_number: string | null
  courier_code: string | null
  order_date: string
  unit_price: number | null
  total_payment_amount: number | null
  product_name: string | null
  product_option: string | null
  receiver_name: string | null
  receiver_tel: string | null
  customer_address: string | null
  zip_code: string | null
  delivery_memo: string | null
  products: {
    id: string
    name: string
    sku: string | null
    price: number
  } | null
}

export async function getOrders(): Promise<{ data: OrderWithProduct[] | null; error: string | null }> {
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
      naver_order_id,
      product_id,
      quantity,
      customer_name,
      orderer_tel,
      status,
      naver_order_status,
      tracking_number,
      courier_code,
      order_date,
      unit_price,
      total_payment_amount,
      product_name,
      product_option,
      receiver_name,
      receiver_tel,
      customer_address,
      zip_code,
      delivery_memo,
      products (
        id,
        name,
        sku,
        price
      )
    `)
    .in('store_id', storeIds)
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, error: formatErrorMessage(parseError(error, 'order', 'fetch')) }
  }

  const typedOrders = orders as unknown as OrderRow[]

  const transformedOrders: OrderWithProduct[] = typedOrders.map((order) => {
    const product = order.products
    const customerName = order.customer_name || 'Unknown'
    const productName = order.product_name || product?.name || 'Unknown Product'

    return {
      id: order.id,
      platformOrderId: order.platform_order_id || order.id.slice(0, 8).toUpperCase(),
      naverOrderId: order.naver_order_id || undefined,
      product: {
        id: product?.id || '',
        name: productName,
        sku: product?.sku || 'N/A',
        price: product?.price || 0,
        option: order.product_option || undefined,
      },
      customer: {
        name: customerName,
        initials: getInitials(customerName),
        color: getAvatarColor(customerName),
        tel: order.orderer_tel || undefined,
      },
      receiver: order.receiver_name ? {
        name: order.receiver_name,
        tel: order.receiver_tel || '',
        address: order.customer_address || '',
        zipCode: order.zip_code || '',
        memo: order.delivery_memo || undefined,
      } : undefined,
      date: order.order_date,
      total: order.total_payment_amount || (product?.price || 0) * order.quantity,
      unitPrice: order.unit_price || product?.price || undefined,
      quantity: order.quantity,
      status: order.status as OrderStatus,
      naverStatus: order.naver_order_status || undefined,
      trackingNumber: order.tracking_number,
      courierCode: order.courier_code,
    }
  })

  return { data: transformedOrders, error: null }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  syncToNaver: boolean = true
): Promise<{ success: boolean; error: string | null; naverSyncResult?: { success: boolean; error?: string } }> {
  const supabase = await createClient()

  let naverSyncResult: { success: boolean; error?: string } | undefined

  if (status === 'Ordered' && syncToNaver) {
    const { confirmNaverOrders } = await import('@/lib/actions/naver-sync')
    const confirmResult = await confirmNaverOrders([orderId])
    naverSyncResult = { 
      success: confirmResult.success, 
      error: confirmResult.error || undefined 
    }
    
    if (confirmResult.success) {
      revalidatePath('/orders')
      revalidatePath('/dashboard')
      return { success: true, error: null, naverSyncResult }
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'order', 'update')) }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null, naverSyncResult }
}

export async function updateTrackingNumber(
  orderId: string,
  trackingNumber: string,
  courierCode: string = 'HANJIN',
  syncToNaver: boolean = true
): Promise<{ success: boolean; error: string | null; naverSyncResult?: { success: boolean; error?: string } }> {
  const supabase = await createClient()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('naver_product_order_id, store_id')
    .eq('id', orderId)
    .single()

  if (fetchError) {
    return { success: false, error: formatErrorMessage(parseError(fetchError, 'order', 'fetch')) }
  }

  const { error } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      courier_code: courierCode,
      status: 'Dispatched' as OrderStatus,
    })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'order', 'update')) }
  }

  let naverSyncResult: { success: boolean; error?: string } | undefined

  if (syncToNaver && order?.naver_product_order_id) {
    const { dispatchToNaver } = await import('@/lib/actions/naver-sync')
    naverSyncResult = await dispatchToNaver(order.store_id, order.naver_product_order_id, courierCode, trackingNumber)
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null, naverSyncResult }
}

export async function cancelOrder(
  orderId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateOrderStatus(orderId, 'Cancelled')
}

export async function checkDeliveryStatusBatch(): Promise<{
  success: boolean
  checked: number
  updated: number
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, checked: 0, updated: 0, error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { success: true, checked: 0, updated: 0, error: null }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: orders, error: fetchError } = await supabase
    .from('orders')
    .select('id, tracking_number, courier_code, status')
    .in('store_id', storeIds)
    .in('status', ['Dispatched', 'Delivering'])
    .not('tracking_number', 'is', null)
    .limit(50)

  if (fetchError) {
    return { success: false, checked: 0, updated: 0, error: fetchError.message }
  }

  if (!orders || orders.length === 0) {
    return { success: true, checked: 0, updated: 0, error: null }
  }

  const { trackHanjinPackage } = await import('@/lib/logistics/hanjin')

  let checkedCount = 0
  let updatedCount = 0

  for (const order of orders) {
    if (!order.tracking_number) continue
    checkedCount++

    try {
      const trackingNumber = order.tracking_number
      const trackingResult = await trackHanjinPackage(trackingNumber, {
        testMode: trackingNumber.startsWith('TEST'),
      })

      if (!trackingResult.success) continue

      let newStatus: OrderStatus | null = null

      if (trackingResult.statusCode === 'DELIVERED') {
        newStatus = 'Delivered'
      } else if (trackingResult.statusCode === 'IN_TRANSIT' || trackingResult.statusCode === 'OUT_FOR_DELIVERY') {
        if (order.status === 'Dispatched') {
          newStatus = 'Delivering'
        }
      }

      if (newStatus && newStatus !== order.status) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id)

        if (!updateError) {
          updatedCount++
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    } catch {
      continue
    }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')

  return { success: true, checked: checkedCount, updated: updatedCount, error: null }
}

interface CreateOrderInput {
  storeId: string
  productId: string
  quantity: number
  customerName: string
  customerAddress?: string
  platformOrderId?: string
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').insert({
    store_id: input.storeId,
    product_id: input.productId,
    quantity: input.quantity,
    customer_name: input.customerName,
    customer_address: input.customerAddress,
    platform_order_id: input.platformOrderId,
    status: 'New' as OrderStatus,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

export async function deleteOrder(
  orderId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'order', 'delete')) }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

interface OrderStatsRow {
  id: string
  quantity: number
  status: string
  products: { price: number } | null
}

export interface DailyStats {
  date: string
  revenue: number
  orders: number
}

export async function getWeeklyStats(): Promise<{
  data: DailyStats[] | null
  error: string | null
}> {
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
  const stats: DailyStats[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        quantity,
        products (price)
      `)
      .in('store_id', storeIds)
      .gte('order_date', date.toISOString())
      .lt('order_date', nextDate.toISOString())
      .not('status', 'in', '("Cancelled","CancelRequested")')

    interface OrderWithPrice {
      id: string
      quantity: number
      products: { price: number } | null
    }

    const typedOrders = (orders || []) as unknown as OrderWithPrice[]
    const revenue = typedOrders.reduce((sum, order) => {
      const price = order.products?.price || 0
      return sum + price * order.quantity
    }, 0)

    stats.push({
      date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      revenue,
      orders: typedOrders.length,
    })
  }

  return { data: stats, error: null }
}

export async function getOrderStatusCounts(): Promise<{
  data: { status: string; count: number }[] | null
  error: string | null
}> {
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

  const statuses: OrderStatus[] = ['New', 'Ordered', 'Dispatched', 'Delivering', 'Delivered', 'Confirmed', 'CancelRequested', 'Cancelled']
  const counts: { status: string; count: number }[] = []

  for (const status of statuses) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('status', status)

    counts.push({ status, count: count || 0 })
  }

  return { data: counts, error: null }
}

export interface DashboardStats {
  dailyRevenue: number
  revenueChange: number
  todayOrders: number
  
  flow: {
    newOrders: number
    preparing: number
    shipping: number
    delivered: number
    confirmed: number
  }
  
  claims: {
    cancelRequests: number
    returnRequests: number
    exchangeRequests: number
    delayedShipping: number
  }
  
  settlement: {
    today: number
    expected: number
  }
}

export async function getDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
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
    return {
      data: {
        dailyRevenue: 0,
        revenueChange: 0,
        todayOrders: 0,
        flow: { newOrders: 0, preparing: 0, shipping: 0, delivered: 0, confirmed: 0 },
        claims: { cancelRequests: 0, returnRequests: 0, exchangeRequests: 0, delayedShipping: 0 },
        settlement: { today: 0, expected: 0 },
      },
      error: null,
    }
  }

  const storeIds = stores.map((s) => s.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const { data: todayOrdersRaw } = await supabase
    .from('orders')
    .select(`id, quantity, status, total_payment_amount, products (price)`)
    .in('store_id', storeIds)
    .gte('order_date', today.toISOString())
    .not('status', 'in', '("Cancelled","CancelRequested")')

  const { data: yesterdayOrdersRaw } = await supabase
    .from('orders')
    .select(`id, quantity, total_payment_amount, products (price)`)
    .in('store_id', storeIds)
    .gte('order_date', yesterday.toISOString())
    .lt('order_date', today.toISOString())
    .not('status', 'in', '("Cancelled","CancelRequested")')

  const statusCounts = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'New'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).in('status', ['Ordered', 'Dispatched']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'Delivering'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'Delivered'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'Confirmed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'CancelRequested'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'ReturnRequested'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('store_id', storeIds).eq('status', 'ExchangeRequested'),
  ])

  const { count: delayedCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('store_id', storeIds)
    .eq('status', 'New')
    .lt('order_date', threeDaysAgo.toISOString())

  const { data: todaySettlement } = await supabase
    .from('settlements')
    .select('settlement_amount')
    .in('store_id', storeIds)
    .eq('settlement_date', today.toISOString().split('T')[0])

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const { data: expectedSettlement } = await supabase
    .from('settlements')
    .select('settlement_amount')
    .in('store_id', storeIds)
    .eq('status', 'pending')

  interface OrderWithPayment {
    id: string
    quantity: number
    status?: string
    total_payment_amount: number | null
    products: { price: number } | null
  }

  const todayOrders = (todayOrdersRaw || []) as unknown as OrderWithPayment[]
  const yesterdayOrders = (yesterdayOrdersRaw || []) as unknown as OrderWithPayment[]

  const getRevenue = (orders: OrderWithPayment[]) => orders.reduce((sum, order) => {
    const amount = order.total_payment_amount || (order.products?.price || 0) * order.quantity
    return sum + amount
  }, 0)

  const todayRevenue = getRevenue(todayOrders)
  const yesterdayRevenue = getRevenue(yesterdayOrders)

  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0

  const todaySettlementTotal = (todaySettlement || []).reduce((sum, s) => sum + (s.settlement_amount || 0), 0)
  const expectedSettlementTotal = (expectedSettlement || []).reduce((sum, s) => sum + (s.settlement_amount || 0), 0)

  return {
    data: {
      dailyRevenue: todayRevenue,
      revenueChange,
      todayOrders: todayOrders.length,
      flow: {
        newOrders: statusCounts[0].count || 0,
        preparing: statusCounts[1].count || 0,
        shipping: statusCounts[2].count || 0,
        delivered: statusCounts[3].count || 0,
        confirmed: statusCounts[4].count || 0,
      },
      claims: {
        cancelRequests: statusCounts[5].count || 0,
        returnRequests: statusCounts[6].count || 0,
        exchangeRequests: statusCounts[7].count || 0,
        delayedShipping: delayedCount || 0,
      },
      settlement: {
        today: todaySettlementTotal,
        expected: expectedSettlementTotal,
      },
    },
    error: null,
  }
}

export async function getOrderStats(): Promise<{
  data: {
    dailyRevenue: number
    revenueChange: number
    newOrders: number
    pendingOrders: number
    totalOrders: number
  } | null
  error: string | null
}> {
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
    return {
      data: {
        dailyRevenue: 0,
        revenueChange: 0,
        newOrders: 0,
        pendingOrders: 0,
        totalOrders: 0,
      },
      error: null,
    }
  }

  const storeIds = stores.map((s) => s.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const { data: todayOrdersRaw } = await supabase
    .from('orders')
    .select(`
      id,
      quantity,
      status,
      products (price)
    `)
    .in('store_id', storeIds)
    .gte('order_date', today.toISOString())
    .not('status', 'in', '("Cancelled","CancelRequested")')

  const { data: yesterdayOrdersRaw } = await supabase
    .from('orders')
    .select(`
      id,
      quantity,
      products (price)
    `)
    .in('store_id', storeIds)
    .gte('order_date', yesterday.toISOString())
    .lt('order_date', today.toISOString())
    .not('status', 'in', '("Cancelled","CancelRequested")')

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('store_id', storeIds)

  const todayOrders = (todayOrdersRaw || []) as unknown as OrderStatsRow[]
  const yesterdayOrders = (yesterdayOrdersRaw || []) as unknown as OrderStatsRow[]

  const todayRevenue = todayOrders.reduce((sum, order) => {
    const price = order.products?.price || 0
    return sum + price * order.quantity
  }, 0)

  const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => {
    const price = order.products?.price || 0
    return sum + price * order.quantity
  }, 0)

  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0

  const newOrders = todayOrders.length
  const pendingOrders = todayOrders.filter((o) => o.status === 'New').length

  return {
    data: {
      dailyRevenue: todayRevenue,
      revenueChange,
      newOrders,
      pendingOrders,
      totalOrders: totalOrders || 0,
    },
    error: null,
  }
}

export async function exportOrdersToExcel(): Promise<{
  data: string | null
  filename: string
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, filename: '', error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: null, filename: '', error: '스토어가 없습니다.' }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      platform_order_id,
      naver_order_id,
      product_name,
      product_option,
      quantity,
      unit_price,
      total_payment_amount,
      customer_name,
      orderer_tel,
      receiver_name,
      receiver_tel,
      customer_address,
      zip_code,
      delivery_memo,
      status,
      tracking_number,
      courier_code,
      order_date
    `)
    .in('store_id', storeIds)
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, filename: '', error: error.message }
  }

  const headers = [
    '주문번호',
    '네이버주문번호',
    '상품명',
    '옵션',
    '수량',
    '단가',
    '결제금액',
    '주문자',
    '주문자연락처',
    '수령인',
    '수령인연락처',
    '배송지',
    '우편번호',
    '배송메모',
    '상태',
    '운송장번호',
    '택배사',
    '주문일시',
  ]

  const statusLabels: Record<string, string> = {
    New: '신규',
    Ordered: '발주확인',
    Dispatched: '발송처리',
    Delivering: '배송중',
    Delivered: '배송완료',
    Confirmed: '구매확정',
    Cancelled: '취소',
  }

  const rows = orders.map((order) => [
    order.platform_order_id || '',
    order.naver_order_id || '',
    order.product_name || '',
    order.product_option || '',
    order.quantity || 0,
    order.unit_price || 0,
    order.total_payment_amount || 0,
    order.customer_name || '',
    order.orderer_tel || '',
    order.receiver_name || '',
    order.receiver_tel || '',
    order.customer_address || '',
    order.zip_code || '',
    order.delivery_memo || '',
    statusLabels[order.status] || order.status,
    order.tracking_number || '',
    order.courier_code || '',
    order.order_date ? new Date(order.order_date).toLocaleString('ko-KR') : '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ),
  ].join('\n')

  const BOM = '\uFEFF'
  const base64 = Buffer.from(BOM + csvContent, 'utf-8').toString('base64')

  const today = new Date().toISOString().split('T')[0]
  const filename = `주문목록_${today}.csv`

  return { data: base64, filename, error: null }
}
