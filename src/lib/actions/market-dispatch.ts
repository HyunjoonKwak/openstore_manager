'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { resolveMarketAccount } from '@/lib/markets/resolve'
import { validateInput, idSchema } from '@/lib/validation'
import { z } from 'zod'

// Dispatch = assign tracking numbers locally, then push to the market
// through the adapter with the two-step preview/confirm flow.

const assignTrackingSchema = z.array(
  z.object({
    orderItemId: idSchema,
    courierCode: z.string().trim().min(1).max(50),
    trackingNumber: z.string().trim().min(1).max(100),
  })
).min(1).max(500)

export async function assignTrackingNumbers(
  updates: Array<{ orderItemId: string; courierCode: string; trackingNumber: string }>
): Promise<{ success: boolean; updatedCount: number; error: string | null }> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { success: false, updatedCount: 0, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(assignTrackingSchema, updates)
  if (validation.error !== null) return { success: false, updatedCount: 0, error: validation.error }

  let updatedCount = 0
  for (const update of validation.data) {
    const { data: item } = await supabase
      .from('order_items')
      .select('id, orders!inner (market_account_id)')
      .eq('id', update.orderItemId)
      .maybeSingle()
    if (!item) continue

    const marketAccountId = (item as unknown as { orders: { market_account_id: string } }).orders
      .market_account_id

    // One shipment row per (courier, tracking number); items point at it
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .upsert(
        {
          user_id: userId,
          market_account_id: marketAccountId,
          courier_code: update.courierCode,
          tracking_number: update.trackingNumber,
          status: 'READY',
        },
        { onConflict: 'user_id,courier_code,tracking_number' }
      )
      .select('id')
      .single()

    if (shipmentError || !shipment) continue

    const { error } = await supabase
      .from('order_items')
      .update({ shipment_id: shipment.id as string })
      .eq('id', update.orderItemId)

    if (!error) updatedCount++
  }

  revalidatePath('/orders/dispatch')
  return { success: true, updatedCount, error: null }
}

// ------------------------------------------------------------------
// Two-step market dispatch
// ------------------------------------------------------------------

export interface DispatchPlanItem {
  orderItemId: string
  marketItemRef: string
  productName: string
  receiverName: string | null
  courierCode: string | null
  trackingNumber: string | null
  marketAccountId: string
  marketAccountName: string
  ready: boolean
  blockReason: string | null
}

interface DispatchQueryRow {
  id: string
  market_item_ref: string
  product_name: string
  status: string
  shipments: { courier_code: string; tracking_number: string } | null
  orders: {
    market_account_id: string
    receiver_name: string | null
    market_accounts: { name: string } | null
  } | null
}

/** Step 1 — preview: which items will be sent, which are blocked. */
export async function planDispatch(
  orderItemIds: string[]
): Promise<{ data: DispatchPlanItem[] | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  if (orderItemIds.length === 0 || orderItemIds.length > 500) {
    return { data: null, error: '1~500건 범위로 선택해주세요.' }
  }

  const { data, error } = await supabase
    .from('order_items')
    .select(
      `id, market_item_ref, product_name, status,
       shipments (courier_code, tracking_number),
       orders!inner (market_account_id, receiver_name, market_accounts (name))`
    )
    .in('id', orderItemIds)

  if (error) return { data: null, error: error.message }

  const rows = (data || []) as unknown as DispatchQueryRow[]
  return {
    data: rows.map((row) => {
      let blockReason: string | null = null
      if (!row.shipments) blockReason = '운송장 번호가 없습니다.'
      else if (row.status === 'Dispatched') blockReason = '이미 발송 처리되었습니다.'
      else if (['Cancelled', 'Returned', 'Exchanged'].includes(row.status)) {
        blockReason = '취소/반품/교환 상태의 주문입니다.'
      }

      return {
        orderItemId: row.id,
        marketItemRef: row.market_item_ref,
        productName: row.product_name,
        receiverName: row.orders?.receiver_name || null,
        courierCode: row.shipments?.courier_code || null,
        trackingNumber: row.shipments?.tracking_number || null,
        marketAccountId: row.orders?.market_account_id || '',
        marketAccountName: row.orders?.market_accounts?.name || '(삭제된 계정)',
        ready: blockReason === null,
        blockReason,
      }
    }),
    error: null,
  }
}

export interface DispatchApplyResult {
  succeeded: string[]
  failed: Array<{ orderItemId: string; error: string }>
  partialFailure: boolean
}

/** Step 2 — confirm: push shipments to each market, record outcomes per item. */
export async function applyDispatch(
  orderItemIds: string[]
): Promise<{ data: DispatchApplyResult | null; error: string | null }> {
  const plan = await planDispatch(orderItemIds)
  if (!plan.data) return { data: null, error: plan.error }

  const supabase = await createRedesignClient()
  const readyItems = plan.data.filter((item) => item.ready)
  if (readyItems.length === 0) {
    return { data: null, error: '발송 가능한 주문이 없습니다.' }
  }

  const result: DispatchApplyResult = { succeeded: [], failed: [], partialFailure: false }

  // Group by market account: one adapter call per account
  const byAccount = new Map<string, DispatchPlanItem[]>()
  for (const item of readyItems) {
    byAccount.set(item.marketAccountId, [...(byAccount.get(item.marketAccountId) || []), item])
  }

  for (const [accountId, items] of byAccount) {
    const { resolved, error: accountError } = await resolveMarketAccount(accountId)
    if (!resolved) {
      for (const item of items) {
        result.failed.push({ orderItemId: item.orderItemId, error: accountError || '계정 오류' })
      }
      continue
    }

    const shipmentResult = await resolved.adapter.registerShipments(
      items.map((item) => ({
        marketItemRef: item.marketItemRef,
        courierCode: item.courierCode!,
        trackingNumber: item.trackingNumber!,
      }))
    )

    for (const item of items) {
      const failure = shipmentResult.failed.find((f) => f.marketItemRef === item.marketItemRef)
      if (failure) {
        result.failed.push({ orderItemId: item.orderItemId, error: failure.error })
        continue
      }
      if (!shipmentResult.succeeded.includes(item.marketItemRef)) {
        // Neither succeeded nor failed — treat as failure, never as success
        result.failed.push({ orderItemId: item.orderItemId, error: '마켓 응답에서 확인되지 않았습니다.' })
        continue
      }

      const { error: updateError } = await supabase
        .from('order_items')
        .update({ status: 'Dispatched' })
        .eq('id', item.orderItemId)

      if (updateError) {
        result.failed.push({
          orderItemId: item.orderItemId,
          error: `마켓에는 반영됐지만 로컬 기록에 실패: ${updateError.message}`,
        })
        continue
      }
      result.succeeded.push(item.orderItemId)
    }
  }

  result.partialFailure = result.succeeded.length > 0 && result.failed.length > 0

  revalidatePath('/orders/dispatch')
  revalidatePath('/orders')
  return { data: result, error: null }
}
