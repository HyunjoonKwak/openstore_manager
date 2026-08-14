'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { validateInput } from '@/lib/validation'
import {
  applyBulkSchema,
  bulkOperationSchema,
  type BulkOperation,
} from '@/lib/validation-redesign'

// Two-step engine for every bulk mutation:
//   1. planBulkOperation  — computes affected items with before/after,
//      touches NOTHING in the DB
//   2. applyBulkOperation — re-checks each item's current value against
//      the plan (drift check) and applies only clean matches
// The drift check replaces a signed plan token: an item whose value
// changed between preview and apply is skipped and reported, never
// silently overwritten.

export interface BulkPlanItem {
  id: string
  label: string
  before: number
  after: number
}

export interface BulkPlan {
  operation: BulkOperation
  items: BulkPlanItem[]
  skippedCount: number
}

function computeAfter(operation: BulkOperation, before: number): number {
  switch (operation.type) {
    case 'price_adjust':
      if (operation.mode === 'percent') {
        return Math.max(0, Math.round(before * (1 + operation.value / 100)))
      }
      return Math.max(0, operation.value)
    case 'stock_set':
      return operation.value
  }
}

export async function planBulkOperation(
  input: BulkOperation
): Promise<{ data: BulkPlan | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(bulkOperationSchema, input)
  if (validation.error !== null) return { data: null, error: validation.error }
  const operation = validation.data

  const column = operation.type === 'price_adjust' ? 'base_price' : 'stock_quantity'
  const { data: rows, error } = await supabase
    .from('master_products')
    .select(`id, name, ${column}`)
    .in('id', operation.targetIds)

  if (error) return { data: null, error: error.message }

  const items: BulkPlanItem[] = ((rows || []) as unknown as Array<Record<string, unknown>>).map(
    (row) => {
      const before = Number(row[column])
      return {
        id: String(row.id),
        label: String(row.name),
        before,
        after: computeAfter(operation, before),
      }
    }
  )

  return {
    data: {
      operation,
      items,
      // RLS or deletion may drop targets between selection and preview
      skippedCount: operation.targetIds.length - items.length,
    },
    error: null,
  }
}

export interface BulkApplyResult {
  appliedCount: number
  drifted: Array<{ id: string; label: string; expectedBefore: number; currentValue: number }>
  failed: Array<{ id: string; error: string }>
}

export async function applyBulkOperation(input: {
  operation: BulkOperation
  expected: Array<{ id: string; before: number }>
}): Promise<{ data: BulkApplyResult | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(applyBulkSchema, input)
  if (validation.error !== null) return { data: null, error: validation.error }
  const { operation, expected } = validation.data

  // Only ids that were in the plan may be applied
  const allowedIds = new Set(operation.targetIds)
  const targets = expected.filter((item) => allowedIds.has(item.id))

  const column = operation.type === 'price_adjust' ? 'base_price' : 'stock_quantity'
  const result: BulkApplyResult = { appliedCount: 0, drifted: [], failed: [] }

  for (const target of targets) {
    const { data: currentRow, error: fetchError } = await supabase
      .from('master_products')
      .select(`id, name, ${column}`)
      .eq('id', target.id)
      .maybeSingle()

    if (fetchError || !currentRow) {
      result.failed = [...result.failed, { id: target.id, error: fetchError?.message || '찾을 수 없음' }]
      continue
    }

    const row = currentRow as unknown as Record<string, unknown>
    const currentValue = Number(row[column])

    if (currentValue !== target.before) {
      result.drifted = [
        ...result.drifted,
        { id: target.id, label: String(row.name), expectedBefore: target.before, currentValue },
      ]
      continue
    }

    const after = computeAfter(operation, currentValue)
    // Conditional update guards against a concurrent change since the read
    const { error: updateError, count } = await supabase
      .from('master_products')
      .update({ [column]: after }, { count: 'exact' })
      .eq('id', target.id)
      .eq(column, target.before)

    if (updateError) {
      result.failed = [...result.failed, { id: target.id, error: updateError.message }]
      continue
    }
    if (!count) {
      result.drifted = [
        ...result.drifted,
        { id: target.id, label: String(row.name), expectedBefore: target.before, currentValue },
      ]
      continue
    }

    if (operation.type === 'stock_set') {
      await supabase.from('stock_ledger').insert({
        master_product_id: target.id,
        delta: after - currentValue,
        quantity_after: after,
        reason: 'adjust',
        note: '일괄 재고 설정',
      })
    }

    result.appliedCount += 1
  }

  revalidatePath('/products')
  return { data: result, error: null }
}
