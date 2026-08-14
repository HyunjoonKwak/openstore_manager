'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { generateSupplierMessage } from '@/lib/message-generator'
import { sendOrderNotification } from '@/lib/notifications'
import type { ContactMethod } from '@/types/database.types'

// Supplier purchase orders on the new schema: group unsent order items
// by supplier, preview the outgoing message, send + mark on confirm.

export interface SupplierOrderItem {
  orderItemId: string
  productName: string
  optionName: string | null
  sku: string | null
  quantity: number
  totalAmount: number | null
  receiverName: string | null
  orderedAt: string
}

export interface SupplierOrderGroup {
  supplierId: string
  supplierName: string
  contactMethod: string
  hasContact: boolean
  items: SupplierOrderItem[]
  messagePreview: string
}

interface SupplierRowFull {
  id: string
  name: string
  contact_number: string | null
  webhook_url: string | null
  contact_method: string
}

interface GroupQueryRow {
  id: string
  product_name: string
  option_name: string | null
  quantity: number
  total_amount: number | null
  supplier_id: string
  created_at: string
  master_products: { sku: string | null } | null
  orders: { receiver_name: string | null; ordered_at: string } | null
}

export async function getSupplierOrderGroups(): Promise<{
  data: SupplierOrderGroup[] | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const [{ data: items, error }, { data: suppliers }] = await Promise.all([
    supabase
      .from('order_items')
      .select(
        `id, product_name, option_name, quantity, total_amount, supplier_id, created_at,
         master_products (sku),
         orders!inner (receiver_name, ordered_at)`
      )
      .in('status', ['New', 'Ordered'])
      .eq('supplier_order_status', 'pending')
      .not('supplier_id', 'is', null),
    supabase
      .from('suppliers')
      .select('id, name, contact_number, webhook_url, contact_method')
      .eq('user_id', userId),
  ])

  if (error) return { data: null, error: error.message }

  const supplierById = new Map(
    ((suppliers || []) as unknown as SupplierRowFull[]).map((supplier) => [supplier.id, supplier])
  )

  const groups = new Map<string, SupplierOrderGroup>()
  for (const row of (items || []) as unknown as GroupQueryRow[]) {
    const supplier = supplierById.get(row.supplier_id)
    if (!supplier) continue

    const item: SupplierOrderItem = {
      orderItemId: row.id,
      productName: row.product_name,
      optionName: row.option_name,
      sku: row.master_products?.sku || null,
      quantity: row.quantity,
      totalAmount: row.total_amount,
      receiverName: row.orders?.receiver_name || null,
      orderedAt: row.orders?.ordered_at || row.created_at,
    }

    const existing = groups.get(supplier.id)
    if (existing) {
      groups.set(supplier.id, { ...existing, items: [...existing.items, item] })
    } else {
      const isWebhook = supplier.contact_method === 'Telegram' || supplier.contact_method === 'Discord'
      groups.set(supplier.id, {
        supplierId: supplier.id,
        supplierName: supplier.name,
        contactMethod: supplier.contact_method,
        hasContact: isWebhook ? !!supplier.webhook_url : !!supplier.contact_number,
        items: [item],
        messagePreview: '',
      })
    }
  }

  const data = [...groups.values()].map((group) => ({
    ...group,
    messagePreview: generateSupplierMessage(
      group.items.map((item) => ({
        product: { sku: item.sku || '-', name: item.productName },
        quantity: item.quantity,
        total: item.totalAmount || 0,
      })),
      { name: group.supplierName }
    ),
  }))

  return { data, error: null }
}

export interface SendSupplierOrderResult {
  sentCount: number
  notificationSent: boolean
  notificationError?: string
}

export async function sendSupplierOrder(input: {
  supplierId: string
  orderItemIds: string[]
  sendNotification?: boolean
}): Promise<{ data: SendSupplierOrderResult | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  if (input.orderItemIds.length === 0 || input.orderItemIds.length > 500) {
    return { data: null, error: '1~500건 범위로 선택해주세요.' }
  }

  const { data: supplierData } = await supabase
    .from('suppliers')
    .select('id, name, contact_number, webhook_url, contact_method')
    .eq('id', input.supplierId)
    .maybeSingle()

  const supplier = supplierData as unknown as SupplierRowFull | null
  if (!supplier) return { data: null, error: '공급업체를 찾을 수 없습니다.' }

  // Only pending items assigned to this supplier may be sent
  const { data: itemRows, error: itemsError } = await supabase
    .from('order_items')
    .select('id, product_name, quantity, total_amount')
    .in('id', input.orderItemIds)
    .eq('supplier_id', input.supplierId)
    .eq('supplier_order_status', 'pending')

  if (itemsError) return { data: null, error: itemsError.message }
  const items = (itemRows || []) as unknown as Array<{
    id: string
    product_name: string
    quantity: number
    total_amount: number | null
  }>
  if (items.length === 0) return { data: null, error: '전송 가능한 항목이 없습니다.' }

  let notificationSent = false
  let notificationError: string | undefined

  if (input.sendNotification !== false) {
    const productSummary =
      items.slice(0, 3).map((item) => `${item.product_name} x${item.quantity}`).join(', ') +
      (items.length > 3 ? ` 외 ${items.length - 3}건` : '')
    const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)

    const result = await sendOrderNotification({
      supplierName: supplier.name,
      supplierPhone: supplier.contact_number ?? undefined,
      webhookUrl: supplier.webhook_url ?? undefined,
      contactMethod: supplier.contact_method as ContactMethod,
      orderCount: items.length,
      productSummary,
      totalAmount,
    })
    notificationSent = result.success
    notificationError = result.error
  }

  const sentAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('order_items')
    .update({ supplier_order_status: 'sent', supplier_sent_at: sentAt })
    .in('id', items.map((item) => item.id))

  if (updateError) return { data: null, error: updateError.message }

  // Log for the audit trail (legacy-shared table, reused as-is)
  await (supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>
    }
  })
    .from('supplier_order_logs')
    .insert({
      supplier_id: supplier.id,
      order_ids: items.map((item) => item.id),
      message_content: null,
      send_method: supplier.contact_method,
      status: notificationSent ? 'sent' : 'pending',
      error_message: notificationError || null,
    })

  revalidatePath('/orders/purchase')
  revalidatePath('/orders')
  return {
    data: { sentCount: items.length, notificationSent, notificationError },
    error: null,
  }
}
