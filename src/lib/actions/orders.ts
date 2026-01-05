'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/types/database.types'

export interface OrderWithProduct {
  id: string
  platformOrderId: string
  product: {
    id: string
    name: string
    sku: string
    price: number
  }
  customer: {
    name: string
    initials: string
    color: string
  }
  date: string
  total: number
  quantity: number
  status: OrderStatus
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
  product_id: string | null
  quantity: number
  customer_name: string | null
  status: string
  tracking_number: string | null
  courier_code: string | null
  order_date: string
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
      product_id,
      quantity,
      customer_name,
      status,
      tracking_number,
      courier_code,
      order_date,
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
    return { data: null, error: error.message }
  }

  const typedOrders = orders as unknown as OrderRow[]

  const transformedOrders: OrderWithProduct[] = typedOrders.map((order) => {
    const product = order.products
    const customerName = order.customer_name || 'Unknown'

    return {
      id: order.id,
      platformOrderId: order.platform_order_id || order.id.slice(0, 8).toUpperCase(),
      product: {
        id: product?.id || '',
        name: product?.name || 'Unknown Product',
        sku: product?.sku || 'N/A',
        price: product?.price || 0,
      },
      customer: {
        name: customerName,
        initials: getInitials(customerName),
        color: getAvatarColor(customerName),
      },
      date: order.order_date,
      total: (product?.price || 0) * order.quantity,
      quantity: order.quantity,
      status: order.status as OrderStatus,
      trackingNumber: order.tracking_number,
      courierCode: order.courier_code,
    }
  })

  return { data: transformedOrders, error: null }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

export async function updateTrackingNumber(
  orderId: string,
  trackingNumber: string,
  courierCode: string = 'HANJIN'
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      courier_code: courierCode,
      status: 'Shipped' as OrderStatus,
    })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true, error: null }
}

export async function cancelOrder(
  orderId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateOrderStatus(orderId, 'Cancelled')
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
    return { success: false, error: error.message }
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

  const statuses: OrderStatus[] = ['New', 'Ordered', 'Shipped', 'Cancelled']
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
