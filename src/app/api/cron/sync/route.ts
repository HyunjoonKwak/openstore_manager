import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NaverCommerceClient } from '@/lib/naver/client'

type SupabaseAdminClient = SupabaseClient

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date().toISOString()
  const { data: schedules, error: schedulesError } = await supabase
    .from('sync_schedules')
    .select(`
      *,
      stores (
        id,
        api_config
      )
    `)
    .eq('is_enabled', true)
    .lte('next_sync_at', now)

  if (schedulesError) {
    console.error('Error fetching schedules:', schedulesError)
    return NextResponse.json({ error: schedulesError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ message: 'No schedules due', processed: 0 })
  }

  interface ScheduleRow {
    id: string
    user_id: string
    store_id: string
    sync_type: string
    interval_minutes: number
    stores: {
      id: string
      api_config: {
        naverClientId?: string
        naverClientSecret?: string
      }
    } | null
  }

  const results = []

  for (const schedule of schedules as unknown as ScheduleRow[]) {
    const apiConfig = schedule.stores?.api_config
    if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
      results.push({
        scheduleId: schedule.id,
        status: 'skipped',
        reason: 'Missing API credentials',
      })
      continue
    }

    const { data: logData } = await supabase
      .from('sync_logs')
      .insert({
        schedule_id: schedule.id,
        sync_type: schedule.sync_type,
        status: 'running',
      })
      .select('id')
      .single()

    const logId = logData?.id

    try {
      const client = new NaverCommerceClient({
        clientId: apiConfig.naverClientId,
        clientSecret: apiConfig.naverClientSecret,
      })

      let itemsSynced = 0

      if (schedule.sync_type === 'orders' || schedule.sync_type === 'both') {
        const ordersResult = await syncOrders(supabase, client, schedule.store_id)
        itemsSynced += ordersResult.count
      }

      if (schedule.sync_type === 'products' || schedule.sync_type === 'both') {
        const productsResult = await syncProducts(supabase, client, schedule.store_id)
        itemsSynced += productsResult.count
      }

      const nextSyncAt = new Date(
        Date.now() + schedule.interval_minutes * 60 * 1000
      ).toISOString()

      await supabase
        .from('sync_schedules')
        .update({
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextSyncAt,
        })
        .eq('id', schedule.id)

      if (logId) {
        await supabase
          .from('sync_logs')
          .update({
            status: 'success',
            items_synced: itemsSynced,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId)
      }

      results.push({
        scheduleId: schedule.id,
        status: 'success',
        itemsSynced,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (logId) {
        await supabase
          .from('sync_logs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId)
      }

      results.push({
        scheduleId: schedule.id,
        status: 'failed',
        error: errorMessage,
      })
    }
  }

  return NextResponse.json({
    message: 'Sync completed',
    processed: results.length,
    results,
  })
}

async function syncOrders(
  supabase: SupabaseAdminClient,
  client: NaverCommerceClient,
  storeId: string
): Promise<{ count: number }> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let count = 0
  const today = new Date()

  for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const fromDate = new Date(d)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = new Date(d)
    toDate.setHours(23, 59, 59, 999)

    try {
      const response = await client.getOrders({
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      })

      if (response.data?.contents) {
        for (const order of response.data.contents) {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('platform_order_id', order.productOrderId)
            .single()

          if (existingOrder) {
            await supabase
              .from('orders')
              .update({
                status: mapNaverOrderStatus(order.orderStatus),
                tracking_number: order.trackingNumber || null,
                courier_code: order.deliveryCompanyCode || null,
              })
              .eq('id', existingOrder.id)
          } else {
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('store_id', storeId)
              .ilike('name', `%${order.productName.slice(0, 20)}%`)
              .limit(1)
              .single()

            await supabase.from('orders').insert({
              store_id: storeId,
              platform_order_id: order.productOrderId,
              product_id: product?.id || null,
              quantity: order.quantity,
              customer_name: order.shippingAddress?.name || order.ordererName,
              customer_address: order.shippingAddress
                ? `${order.shippingAddress.baseAddress} ${order.shippingAddress.detailAddress}`
                : null,
              status: mapNaverOrderStatus(order.orderStatus),
              tracking_number: order.trackingNumber || null,
              courier_code: order.deliveryCompanyCode || null,
              order_date: order.orderDate,
            })
          }
          count++
        }
      }
    } catch (error) {
      console.error(`Error syncing orders for date ${d.toISOString()}:`, error)
    }
  }

  return { count }
}

async function syncProducts(
  supabase: SupabaseAdminClient,
  client: NaverCommerceClient,
  storeId: string
): Promise<{ count: number }> {
  let count = 0

  try {
    const response = await client.searchProducts({
      productStatusTypes: ['SALE', 'SUSPENSION', 'WAIT', 'UNADMISSION', 'REJECTION', 'PROHIBITION'],
      pageSize: 100,
    })

    if (response.contents) {
      for (const product of response.contents) {
        const channelProduct = product.channelProducts?.[0]
        if (!channelProduct) continue

        const platformProductId = String(channelProduct.channelProductNo)

        const { data: existingByPlatformId } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .eq('platform_product_id', platformProductId)
          .single()

        if (existingByPlatformId) {
          await supabase
            .from('products')
            .update({
              name: channelProduct.name,
              price: channelProduct.discountedPrice || channelProduct.salePrice,
              stock_quantity: channelProduct.stockQuantity,
              status: channelProduct.statusType,
              image_url: channelProduct.representativeImage?.url || null,
              category: channelProduct.wholeCategoryName || null,
              brand: channelProduct.brandName || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByPlatformId.id)
        } else {
          const sku = channelProduct.sellerManagementCode || null

          const { data: existingBySku } = sku
            ? await supabase
                .from('products')
                .select('id')
                .eq('store_id', storeId)
                .eq('sku', sku)
                .single()
            : { data: null }

          if (existingBySku) {
            await supabase
              .from('products')
              .update({
                name: channelProduct.name,
                price: channelProduct.discountedPrice || channelProduct.salePrice,
                stock_quantity: channelProduct.stockQuantity,
                platform_product_id: platformProductId,
                status: channelProduct.statusType,
                image_url: channelProduct.representativeImage?.url || null,
                category: channelProduct.wholeCategoryName || null,
                brand: channelProduct.brandName || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingBySku.id)
          } else {
            await supabase.from('products').insert({
              store_id: storeId,
              name: channelProduct.name,
              price: channelProduct.discountedPrice || channelProduct.salePrice,
              stock_quantity: channelProduct.stockQuantity,
              sku,
              platform_product_id: platformProductId,
              status: channelProduct.statusType,
              image_url: channelProduct.representativeImage?.url || null,
              category: channelProduct.wholeCategoryName || null,
              brand: channelProduct.brandName || null,
            })
          }
        }
        count++
      }
    }
  } catch (error) {
    console.error('Error syncing products:', error)
  }

  return { count }
}

function mapNaverOrderStatus(naverStatus: string): 'New' | 'Ordered' | 'Shipped' | 'Cancelled' {
  const statusMap: Record<string, 'New' | 'Ordered' | 'Shipped' | 'Cancelled'> = {
    PAYED: 'New',
    DELIVERED: 'Shipped',
    DELIVERING: 'Shipped',
    DISPATCHED: 'Shipped',
    CANCELLED: 'Cancelled',
    CANCEL_REQUESTED: 'Cancelled',
    RETURNED: 'Cancelled',
    RETURN_REQUESTED: 'Cancelled',
  }
  return statusMap[naverStatus] || 'New'
}
