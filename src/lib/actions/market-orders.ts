'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { resolveMarketAccount } from '@/lib/markets/resolve'
import type { ClaimAction } from '@/lib/markets/types'
import type { MarketPlatformDb, OrderItemStatusDb } from '@/types/redesign.types'

// Unified order reads across every market account. Market filter is an
// optional parameter, not ambient cookie state.

export interface OrderItemView {
  id: string
  orderId: string
  marketItemRef: string
  productName: string
  optionName: string | null
  quantity: number
  unitPrice: number | null
  totalAmount: number | null
  status: OrderItemStatusDb
  marketStatusRaw: string | null
  supplierOrderStatus: string
  shipmentId: string | null
  // header fields
  marketAccountId: string
  marketAccountName: string
  platform: MarketPlatformDb
  marketOrderRef: string
  orderedAt: string
  ordererName: string | null
  receiverName: string | null
  receiverTel: string | null
  receiverAddress: string | null
  zipCode: string | null
  deliveryMemo: string | null
  // shipment fields
  courierCode: string | null
  trackingNumber: string | null
}

interface OrderItemQueryRow {
  id: string
  order_id: string
  market_item_ref: string
  product_name: string
  option_name: string | null
  quantity: number
  unit_price: number | null
  total_amount: number | null
  status: OrderItemStatusDb
  market_status_raw: string | null
  supplier_order_status: string
  shipment_id: string | null
  shipments: { courier_code: string; tracking_number: string } | null
  orders: {
    market_account_id: string
    market_order_ref: string
    ordered_at: string
    orderer_name: string | null
    receiver_name: string | null
    receiver_tel: string | null
    receiver_address: string | null
    zip_code: string | null
    delivery_memo: string | null
    market_accounts: { name: string; platform: MarketPlatformDb } | null
  } | null
}

export async function getOrderItems(params?: {
  marketAccountId?: string
  status?: OrderItemStatusDb | 'all'
  fromDate?: string
  limit?: number
}): Promise<{ data: OrderItemView[] | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  let query = supabase
    .from('order_items')
    .select(
      `id, order_id, market_item_ref, product_name, option_name, quantity,
       unit_price, total_amount, status, market_status_raw,
       supplier_order_status, shipment_id,
       shipments (courier_code, tracking_number),
       orders!inner (
         market_account_id, market_order_ref, ordered_at, orderer_name,
         receiver_name, receiver_tel, receiver_address, zip_code, delivery_memo,
         market_accounts (name, platform)
       )`
    )
    .order('created_at', { ascending: false })
    .limit(params?.limit || 500)

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params?.marketAccountId) {
    query = query.eq('orders.market_account_id', params.marketAccountId)
  }
  if (params?.fromDate) {
    query = query.gte('orders.ordered_at', params.fromDate)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }

  const rows = (data || []) as unknown as OrderItemQueryRow[]
  return {
    data: rows
      .filter((row) => row.orders !== null)
      .map((row) => ({
        id: row.id,
        orderId: row.order_id,
        marketItemRef: row.market_item_ref,
        productName: row.product_name,
        optionName: row.option_name,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        totalAmount: row.total_amount,
        status: row.status,
        marketStatusRaw: row.market_status_raw,
        supplierOrderStatus: row.supplier_order_status,
        shipmentId: row.shipment_id,
        marketAccountId: row.orders!.market_account_id,
        marketAccountName: row.orders!.market_accounts?.name || '(삭제된 계정)',
        platform: row.orders!.market_accounts?.platform || 'naver',
        marketOrderRef: row.orders!.market_order_ref,
        orderedAt: row.orders!.ordered_at,
        ordererName: row.orders!.orderer_name,
        receiverName: row.orders!.receiver_name,
        receiverTel: row.orders!.receiver_tel,
        receiverAddress: row.orders!.receiver_address,
        zipCode: row.orders!.zip_code,
        deliveryMemo: row.orders!.delivery_memo,
        courierCode: row.shipments?.courier_code || null,
        trackingNumber: row.shipments?.tracking_number || null,
      })),
    error: null,
  }
}

export async function getOrderStats(): Promise<{
  data: Record<string, number> | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase.from('order_items').select('status')
  if (error) return { data: null, error: error.message }

  const stats: Record<string, number> = {}
  for (const row of data || []) {
    const status = row.status as string
    stats[status] = (stats[status] || 0) + 1
  }
  return { data: stats, error: null }
}

/**
 * Claim/confirm actions route through the market adapter and update the
 * local item only when the market accepted the change.
 */
export async function processOrderClaim(input: {
  orderItemId: string
  action: ClaimAction
  reason?: string
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select('id, market_item_ref, orders!inner (market_account_id)')
    .eq('id', input.orderItemId)
    .maybeSingle()

  if (itemError) return { success: false, error: itemError.message }
  if (!item) return { success: false, error: '주문 항목을 찾을 수 없습니다.' }

  const orderHeader = (item as unknown as { orders: { market_account_id: string } }).orders
  const { resolved, error: accountError } = await resolveMarketAccount(orderHeader.market_account_id)
  if (!resolved) return { success: false, error: accountError }

  const result = await resolved.adapter.processClaim(
    (item as unknown as { market_item_ref: string }).market_item_ref,
    input.action,
    input.reason
  )
  if (!result.ok) return { success: false, error: result.error }

  const statusAfter: Partial<Record<ClaimAction, OrderItemStatusDb>> = {
    confirm_order: 'Ordered',
    approve_cancel: 'Cancelled',
    reject_cancel: 'Ordered',
    approve_return: 'Returned',
    reject_return: 'Delivered',
    approve_exchange: 'Exchanged',
    reject_exchange: 'Delivered',
  }

  const nextStatus = statusAfter[input.action]
  if (nextStatus) {
    await supabase.from('order_items').update({ status: nextStatus }).eq('id', input.orderItemId)
  }

  revalidatePath('/orders')
  return { success: true, error: null }
}
