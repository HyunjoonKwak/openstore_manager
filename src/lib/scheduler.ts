import cron, { ScheduledTask } from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { NaverCommerceClient } from '@/lib/naver/client'
import { decryptSecret } from '@/lib/secret-crypto'

const activeCronJobs = new Map<string, ScheduledTask>()

// Overlap guard: schedule IDs whose sync is currently in flight
const runningSyncJobs = new Set<string>()

interface SyncScheduleRow {
  id: string
  user_id: string
  store_id: string
  sync_type: 'orders' | 'products' | 'both'
  interval_minutes: number
  is_enabled: boolean
  sync_at_minute: number | null
  sync_time: string | null
  stores: {
    id: string
    api_config: {
      naverClientId?: string
      naverClientSecret?: string
    }
  } | null
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function toCronExpression(intervalMinutes: number, syncAtMinute: number, syncTime?: string | null): string {
  if (intervalMinutes === 1440 && syncTime) {
    const [hour, minute] = syncTime.split(':').map(Number)
    return `${minute} ${hour} * * *`
  }

  if (intervalMinutes === 60) {
    return `${syncAtMinute} * * * *`
  }

  if (intervalMinutes === 120) {
    return `${syncAtMinute} */2 * * *`
  }

  if (intervalMinutes === 360) {
    return `${syncAtMinute} 0,6,12,18 * * *`
  }

  if (intervalMinutes === 720) {
    return `${syncAtMinute} 0,12 * * *`
  }

  return `*/${Math.max(1, Math.floor(intervalMinutes))} * * * *`
}

async function executeSyncJob(scheduleId: string) {
  if (runningSyncJobs.has(scheduleId)) {
    console.error(`⏭️ [Scheduler] Sync already in progress, skipping: ${scheduleId}`)
    return
  }
  runningSyncJobs.add(scheduleId)

  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null
  let logId: string | undefined

  try {
    console.log(`🚀 [Scheduler] Executing sync for schedule: ${scheduleId}`)

    supabase = getSupabaseAdmin()

    const { data: schedule, error: fetchError } = await supabase
      .from('sync_schedules')
      .select(`
        *,
        stores (
          id,
          api_config
        )
      `)
      .eq('id', scheduleId)
      .single()

    if (fetchError || !schedule) {
      console.error(`❌ [Scheduler] Schedule not found: ${scheduleId}`)
      return
    }

    const typedSchedule = schedule as unknown as SyncScheduleRow

    if (!typedSchedule.is_enabled) {
      console.log(`⏭️ [Scheduler] Schedule disabled: ${scheduleId}`)
      return
    }

    const apiConfig = typedSchedule.stores?.api_config
    if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
      console.log(`⏭️ [Scheduler] Missing API credentials for: ${scheduleId}`)
      return
    }

    const { data: logData } = await supabase
      .from('sync_logs')
      .insert({
        schedule_id: scheduleId,
        sync_type: typedSchedule.sync_type,
        status: 'running',
      })
      .select('id')
      .single()

    logId = logData?.id

    const client = new NaverCommerceClient({
      clientId: apiConfig.naverClientId,
      // Stored encrypted at rest; legacy plaintext passes through unchanged
      clientSecret: decryptSecret(apiConfig.naverClientSecret),
    })

    let itemsSynced = 0
    let itemsFailed = 0

    if (typedSchedule.sync_type === 'orders' || typedSchedule.sync_type === 'both') {
      const ordersResult = await syncOrders(supabase, client, typedSchedule.store_id)
      itemsSynced += ordersResult.count
      itemsFailed += ordersResult.failed
    }

    if (typedSchedule.sync_type === 'products' || typedSchedule.sync_type === 'both') {
      const productsResult = await syncProducts(supabase, client, typedSchedule.store_id)
      itemsSynced += productsResult.count
      itemsFailed += productsResult.failed
    }

    await supabase
      .from('sync_schedules')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)

    if (logId) {
      // sync_logs.status only allows 'success' | 'failed' | 'running',
      // so any error marks the run 'failed' with counts in error_message
      await supabase
        .from('sync_logs')
        .update({
          status: itemsFailed > 0 ? 'failed' : 'success',
          items_synced: itemsSynced,
          error_message:
            itemsFailed > 0
              ? `${itemsFailed} error(s) during sync, ${itemsSynced} item(s) synced`
              : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId)
    }

    console.log(`✅ [Scheduler] Sync completed: ${scheduleId}, items: ${itemsSynced}, errors: ${itemsFailed}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ [Scheduler] Sync failed: ${scheduleId}`, error)

    if (supabase && logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId)
    }
  } finally {
    runningSyncJobs.delete(scheduleId)
  }
}

async function syncOrders(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  client: NaverCommerceClient,
  storeId: string
): Promise<{ count: number; failed: number }> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let count = 0
  let failed = 0
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
            .maybeSingle()

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
              .ilike('name', `%${escapeLikePattern(order.productName.slice(0, 20))}%`)
              .limit(1)
              .maybeSingle()

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
      failed++
      console.error(`Error syncing orders for date ${d.toISOString()}:`, error)
    }
  }

  return { count, failed }
}

async function syncProducts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  client: NaverCommerceClient,
  storeId: string
): Promise<{ count: number; failed: number }> {
  let count = 0
  let failed = 0

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
          .maybeSingle()

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
                .maybeSingle()
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
    failed++
    console.error('Error syncing products:', error)
  }

  return { count, failed }
}

// Escape LIKE/ILIKE metacharacters (% _ \) so user data cannot alter the pattern
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function mapNaverOrderStatus(naverStatus: string): string {
  const statusMap: Record<string, string> = {
    PAYED: 'New',
    PAYMENT_WAITING: 'New',
    DELIVERING: 'Delivering',
    DELIVERED: 'Delivered',
    PURCHASE_DECIDED: 'Confirmed',
    DISPATCHED: 'Dispatched',
    CANCELED: 'Cancelled',
    CANCELLED: 'Cancelled',
    CANCELED_BY_NOPAYMENT: 'Cancelled',
    RETURNED: 'Returned',
    EXCHANGED: 'Exchanged',
    CANCEL_REQUEST: 'CancelRequested',
    CANCEL_REQUESTED: 'CancelRequested',
    RETURN_REQUEST: 'ReturnRequested',
    RETURN_REQUESTED: 'ReturnRequested',
    EXCHANGE_REQUEST: 'ExchangeRequested',
    EXCHANGE_REQUESTED: 'ExchangeRequested',
  }
  return statusMap[naverStatus] || 'New'
}

export function registerSchedule(
  scheduleId: string,
  intervalMinutes: number,
  syncAtMinute: number,
  syncTime?: string | null
): boolean {
  try {
    if (activeCronJobs.has(scheduleId)) {
      console.log(`   Removing existing schedule: ${scheduleId}`)
      const existingJob = activeCronJobs.get(scheduleId)
      existingJob?.stop()
      activeCronJobs.delete(scheduleId)
    }

    const cronExpr = toCronExpression(intervalMinutes, syncAtMinute, syncTime)

    if (!cron.validate(cronExpr)) {
      console.error(`   ❌ Invalid cron expression: ${cronExpr}`)
      return false
    }

    console.log(`   Creating cron job: ${cronExpr} (timezone: Asia/Seoul)`)

    const task = cron.schedule(
      cronExpr,
      () => {
        console.log(`🕐 [Scheduler] Cron triggered for: ${scheduleId}`)
        // Fire-and-forget: catch rejections so they never crash the process
        executeSyncJob(scheduleId).catch((error) => {
          console.error(`❌ [Scheduler] Unhandled sync error for ${scheduleId}:`, error)
        })
      },
      {
        timezone: 'Asia/Seoul',
      }
    )

    activeCronJobs.set(scheduleId, task)
    console.log(`   ✅ Schedule registered: ${scheduleId}`)
    console.log(`   Active schedules: ${activeCronJobs.size}`)

    return true
  } catch (error) {
    console.error(`   ❌ Failed to register schedule ${scheduleId}:`, error)
    return false
  }
}

export function unregisterSchedule(scheduleId: string): boolean {
  try {
    const job = activeCronJobs.get(scheduleId)
    if (job) {
      job.stop()
      activeCronJobs.delete(scheduleId)
      console.log(`✅ Schedule unregistered: ${scheduleId}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`Failed to unregister schedule ${scheduleId}:`, error)
    return false
  }
}

export function clearAllSchedules(): number {
  const count = activeCronJobs.size
  if (count === 0) {
    console.log('🧹 No existing cron jobs to clear')
    return 0
  }

  console.log(`🧹 Clearing ${count} existing cron job(s)...`)
  activeCronJobs.forEach((job, scheduleId) => {
    console.log(`   Stopping: ${scheduleId}`)
    job.stop()
  })
  activeCronJobs.clear()
  console.log('✅ All cron jobs cleared')
  return count
}

export async function loadAllSchedules(): Promise<number> {
  try {
    clearAllSchedules()

    console.log('📅 Loading all active sync schedules...')
    console.log(`   Current time: ${new Date().toISOString()}`)
    console.log(`   KST: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)

    const supabase = getSupabaseAdmin()

    const { data: schedules, error } = await supabase
      .from('sync_schedules')
      .select(`
        *,
        stores (
          id,
          store_name,
          api_config
        )
      `)
      .eq('is_enabled', true)

    if (error) {
      console.error('❌ Failed to fetch schedules:', error)
      return 0
    }

    if (!schedules || schedules.length === 0) {
      console.log('   No active schedules found')
      return 0
    }

    console.log(`   Found ${schedules.length} active schedule(s) in DB`)

    let loadedCount = 0
    for (const schedule of schedules) {
      const typedSchedule = schedule as unknown as SyncScheduleRow & { stores: { store_name?: string } | null }
      const storeName = typedSchedule.stores?.store_name || 'Unknown'
      
      console.log(`   Registering schedule for store: ${storeName}`)
      console.log(`     Interval: ${typedSchedule.interval_minutes} minutes`)
      console.log(`     Sync at minute: ${typedSchedule.sync_at_minute ?? 0}`)
      console.log(`     Sync time: ${typedSchedule.sync_time || 'N/A'}`)
      console.log(`     Type: ${typedSchedule.sync_type}`)

      const success = registerSchedule(
        typedSchedule.id,
        typedSchedule.interval_minutes,
        typedSchedule.sync_at_minute ?? 0,
        typedSchedule.sync_time
      )

      if (success) {
        loadedCount++
      }
    }

    console.log(`✅ Loaded ${loadedCount}/${schedules.length} schedule(s)`)
    return loadedCount
  } catch (error) {
    console.error('❌ Failed to load schedules:', error)
    return 0
  }
}

export async function updateScheduleFromDB(scheduleId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()

    const { data: schedule, error } = await supabase
      .from('sync_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (error || !schedule) {
      unregisterSchedule(scheduleId)
      return false
    }

    const typedSchedule = schedule as unknown as SyncScheduleRow

    if (!typedSchedule.is_enabled) {
      unregisterSchedule(scheduleId)
      return true
    }

    return registerSchedule(
      scheduleId,
      typedSchedule.interval_minutes,
      typedSchedule.sync_at_minute ?? 0,
      typedSchedule.sync_time
    )
  } catch (error) {
    console.error(`Failed to update schedule ${scheduleId}:`, error)
    return false
  }
}

export async function runScheduleNow(scheduleId: string): Promise<boolean> {
  try {
    console.log(`▶️ Running schedule immediately: ${scheduleId}`)
    await executeSyncJob(scheduleId)
    return true
  } catch (error) {
    console.error(`Failed to run schedule ${scheduleId}:`, error)
    return false
  }
}

export function getActiveSchedules(): string[] {
  return Array.from(activeCronJobs.keys())
}
