#!/usr/bin/env node
// One-off initial migration sync, run with the service role (no user
// session). Mirrors actions/market-sync.ts: pull products (creating
// masters + listings + snapshots, reconnecting suppliers from
// legacy_products), then orders (7d), then settlements (30d).
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { NaverAdapter } from '../src/lib/markets/naver/adapter.ts'
import { decryptApiConfigSecrets } from '../src/lib/secret-crypto.ts'
import type { RemoteListingSummary } from '../src/lib/markets/types.ts'

async function loadEnv(file: string) {
  const text = await readFile(file, 'utf8')
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

async function main() {
  const env = await loadEnv('.env.local')
  // decryptSecret reads the key from process.env
  process.env.SECRETS_ENCRYPTION_KEY = env.SECRETS_ENCRYPTION_KEY
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

  const { data: account, error: accountError } = await supabase
    .from('market_accounts')
    .select('*')
    .eq('platform', 'naver')
    .limit(1)
    .single()
  if (accountError || !account) throw new Error(`market account: ${accountError?.message}`)

  const config = decryptApiConfigSecrets(account.api_config as Record<string, string>)
  if (!config.naverClientId || !config.naverClientSecret) {
    throw new Error('네이버 API 키가 없습니다.')
  }
  const adapter = new NaverAdapter({
    clientId: config.naverClientId,
    clientSecret: config.naverClientSecret,
    sellerId: config.naverSellerId,
  })

  console.log(`계정: ${account.name} (${account.id})`)
  const conn = await adapter.testConnection()
  if (!conn.ok) throw new Error(`네이버 연결 실패: ${conn.error}`)
  console.log('네이버 연결 OK')

  // ----- legacy supplier refs -----
  const { data: legacyRows } = await supabase
    .from('legacy_products')
    .select('sku, platform_product_id, supplier_id')
  const legacyRefs = (legacyRows || []).filter((row) => row.supplier_id)
  console.log(`legacy supplier 매핑: ${legacyRefs.length}건`)

  const findSupplier = (remote: RemoteListingSummary): string | null => {
    const origin = remote.remoteRefs.originProductNo
    const byId = legacyRefs.find((ref) => ref.platform_product_id && ref.platform_product_id === origin)
    if (byId) return byId.supplier_id
    if (remote.sku) {
      const bySku = legacyRefs.find((ref) => ref.sku && ref.sku === remote.sku)
      if (bySku) return bySku.supplier_id
    }
    return null
  }

  // ----- products -----
  const listings = await adapter.fetchAllListings()
  console.log(`네이버 상품: ${listings.length}건`)

  let created = 0
  let linkedSuppliers = 0
  for (const remote of listings) {
    const { data: existingListing } = await supabase
      .from('market_listings')
      .select('id')
      .eq('market_account_id', account.id)
      .eq('remote_ref', remote.remoteRef)
      .maybeSingle()

    let listingId: string
    if (existingListing) {
      listingId = existingListing.id
      await supabase
        .from('market_listings')
        .update({ remote_status: remote.remoteStatus, remote_refs: remote.remoteRefs })
        .eq('id', listingId)
    } else {
      let masterId: string | null = null
      if (remote.sku) {
        const { data: bySku } = await supabase
          .from('master_products')
          .select('id')
          .eq('user_id', account.user_id)
          .eq('sku', remote.sku)
          .maybeSingle()
        if (bySku) masterId = bySku.id
      }
      if (!masterId) {
        const supplierId = findSupplier(remote)
        if (supplierId) linkedSuppliers++
        const { data: master, error } = await supabase
          .from('master_products')
          .insert({
            user_id: account.user_id,
            name: remote.name,
            base_price: remote.price,
            stock_quantity: remote.stockQuantity,
            sku: remote.sku || `NAVER-${remote.remoteRef}`,
            brand: remote.brand,
            category_text: remote.category,
            image_url: remote.imageUrl,
            supplier_id: supplierId,
          })
          .select('id')
          .single()
        if (error || !master) {
          console.error(`  master 실패 (${remote.name}): ${error?.message}`)
          continue
        }
        masterId = master.id
        if (remote.stockQuantity > 0) {
          await supabase.from('stock_ledger').insert({
            master_product_id: masterId,
            delta: remote.stockQuantity,
            quantity_after: remote.stockQuantity,
            reason: 'initial',
            note: `${account.name} 최초 동기화`,
          })
        }
      }
      const { data: newListing, error: listingError } = await supabase
        .from('market_listings')
        .insert({
          master_product_id: masterId,
          market_account_id: account.id,
          remote_ref: remote.remoteRef,
          remote_refs: remote.remoteRefs,
          status: 'published',
          remote_status: remote.remoteStatus,
        })
        .select('id')
        .single()
      if (listingError || !newListing) {
        console.error(`  listing 실패 (${remote.name}): ${listingError?.message}`)
        continue
      }
      listingId = newListing.id
      created++
    }

    await supabase.from('listing_snapshots').insert({
      listing_id: listingId,
      remote_status: remote.remoteStatus,
      name: remote.name,
      price: remote.price,
      stock_quantity: remote.stockQuantity,
      category: remote.category,
      raw: JSON.parse(JSON.stringify(remote.raw ?? {})),
    })
  }
  console.log(`상품 동기화 완료: 신규 ${created}건, supplier 연결 ${linkedSuppliers}건`)

  // listing lookup for order item linking
  const { data: listingRows } = await supabase
    .from('market_listings')
    .select('id, master_product_id, remote_ref, remote_refs, master_products (supplier_id)')
    .eq('market_account_id', account.id)
  const lookup = new Map<string, { listingId: string; masterId: string; supplierId: string | null }>()
  for (const row of (listingRows || []) as unknown as Array<{
    id: string
    master_product_id: string
    remote_ref: string | null
    remote_refs: Record<string, string> | null
    master_products: { supplier_id: string | null } | null
  }>) {
    const entry = {
      listingId: row.id,
      masterId: row.master_product_id,
      supplierId: row.master_products?.supplier_id || null,
    }
    if (row.remote_ref) lookup.set(row.remote_ref, entry)
    if (row.remote_refs?.originProductNo) lookup.set(row.remote_refs.originProductNo, entry)
  }

  // ----- orders (7 days) -----
  const orders = await adapter.fetchOrders({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  console.log(`네이버 주문(7일): ${orders.length}건`)

  let orderCount = 0
  for (const order of orders) {
    const { data: header, error: headerError } = await supabase
      .from('orders')
      .upsert(
        {
          user_id: account.user_id,
          market_account_id: account.id,
          market_order_ref: order.marketOrderRef,
          ordered_at: order.orderedAt.toISOString(),
          orderer_name: order.ordererName,
          orderer_tel: order.ordererTel,
          receiver_name: order.receiverName,
          receiver_tel: order.receiverTel,
          receiver_address: order.receiverAddress,
          zip_code: order.zipCode,
          delivery_memo: order.deliveryMemo,
          total_payment_amount: order.totalPaymentAmount,
          raw: JSON.parse(JSON.stringify(order.raw ?? {})),
        },
        { onConflict: 'market_account_id,market_order_ref' }
      )
      .select('id')
      .single()
    if (headerError || !header) {
      console.error(`  주문 실패 (${order.marketOrderRef}): ${headerError?.message}`)
      continue
    }

    for (const item of order.items) {
      const linked = item.remoteProductRef ? lookup.get(item.remoteProductRef) : undefined
      let shipmentId: string | null = null
      if (item.trackingNumber && item.courierCode) {
        const { data: shipment } = await supabase
          .from('shipments')
          .upsert(
            {
              user_id: account.user_id,
              market_account_id: account.id,
              courier_code: item.courierCode,
              tracking_number: item.trackingNumber,
              status: item.status === 'Delivered' ? 'DELIVERED' : 'IN_PROGRESS',
            },
            { onConflict: 'user_id,courier_code,tracking_number' }
          )
          .select('id')
          .single()
        shipmentId = shipment?.id || null
      }
      const { error: itemError } = await supabase.from('order_items').upsert(
        {
          order_id: header.id,
          market_item_ref: item.marketItemRef,
          listing_id: linked?.listingId || null,
          master_product_id: linked?.masterId || null,
          product_name: item.productName,
          option_name: item.optionName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.totalAmount,
          status: item.status,
          market_status_raw: item.marketStatusRaw,
          shipment_id: shipmentId,
          supplier_id: linked?.supplierId || null,
        },
        { onConflict: 'order_id,market_item_ref' }
      )
      if (itemError) console.error(`  항목 실패 (${item.marketItemRef}): ${itemError.message}`)
    }
    orderCount++
  }
  console.log(`주문 동기화 완료: ${orderCount}건`)

  // ----- settlements (30 days) -----
  try {
    const settlements = await adapter.fetchSettlements({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    })
    let settlementCount = 0
    for (const settlement of settlements) {
      const { error } = await supabase.from('settlements').upsert(
        {
          market_account_id: account.id,
          settlement_date: settlement.settlementDate,
          order_count: settlement.orderCount,
          sales_amount: settlement.salesAmount,
          commission_amount: settlement.commissionAmount,
          delivery_fee_amount: settlement.deliveryFeeAmount,
          discount_amount: settlement.discountAmount,
          settlement_amount: settlement.settlementAmount,
          status: 'confirmed',
          raw: JSON.parse(JSON.stringify(settlement.raw ?? {})),
        },
        { onConflict: 'market_account_id,settlement_date' }
      )
      if (!error) settlementCount++
    }
    console.log(`정산 동기화 완료: ${settlementCount}건`)
  } catch (error) {
    console.error(`정산 동기화 실패(계속 진행): ${error instanceof Error ? error.message : error}`)
  }

  await supabase.from('sync_runs').insert({
    market_account_id: account.id,
    sync_type: 'both',
    direction: 'pull',
    status: 'completed',
    items_processed: listings.length + orders.length,
    completed_at: new Date().toISOString(),
  })

  console.log('\n=== 최초 이관 동기화 완료 ===')
}

main().catch((error) => {
  console.error('Initial sync failed:', error)
  process.exit(1)
})
