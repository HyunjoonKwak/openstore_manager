import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trackHanjinPackage } from '@/lib/logistics/hanjin'
import type { OrderStatus, Json } from '@/types/database.types'

const CRON_SECRET = process.env.CRON_SECRET

interface OrderToCheck {
  id: string
  tracking_number: string
  courier_code: string
  status: OrderStatus
  store_id: string
}

interface StoreApiConfig {
  deliveryCheckTimes?: number[]
  deliveryCheckEnabled?: boolean
}

function getCurrentKSTHour(): number {
  const kstOffset = 9 * 60
  const now = new Date()
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const kstMinutes = utcMinutes + kstOffset
  return Math.floor((kstMinutes % 1440) / 60)
}

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
  const currentKSTHour = getCurrentKSTHour()

  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, api_config')

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        message: 'No stores configured',
        currentKSTHour,
        checked: 0,
        updated: 0,
      })
    }

    const activeStoreIds: string[] = []
    for (const store of stores) {
      const config = (store.api_config || {}) as StoreApiConfig
      const enabled = config.deliveryCheckEnabled ?? true
      const times = config.deliveryCheckTimes || [9, 15, 21]
      
      if (enabled && times.includes(currentKSTHour)) {
        activeStoreIds.push(store.id)
      }
    }

    if (activeStoreIds.length === 0) {
      return NextResponse.json({
        message: 'Not scheduled for current hour',
        currentKSTHour,
        checked: 0,
        updated: 0,
      })
    }

    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_number, courier_code, status, store_id')
      .in('store_id', activeStoreIds)
      .in('status', ['Dispatched', 'Delivering'])
      .not('tracking_number', 'is', null)
      .limit(100)

    if (fetchError) {
      console.error('[check-delivery] Error fetching orders:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        message: 'No orders to check', 
        currentKSTHour,
        activeStores: activeStoreIds.length,
        checked: 0,
        updated: 0 
      })
    }

    const typedOrders = orders as OrderToCheck[]
    let checkedCount = 0
    let updatedCount = 0
    const results: Array<{
      orderId: string
      trackingNumber: string
      previousStatus: string
      newStatus: string | null
      error?: string
    }> = []

    for (const order of typedOrders) {
      checkedCount++

      try {
        const trackingResult = await trackHanjinPackage(order.tracking_number, {
          testMode: order.tracking_number.startsWith('TEST'),
        })

        if (!trackingResult.success) {
          results.push({
            orderId: order.id,
            trackingNumber: order.tracking_number,
            previousStatus: order.status,
            newStatus: null,
            error: trackingResult.error || 'Tracking failed',
          })
          continue
        }

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

          if (updateError) {
            results.push({
              orderId: order.id,
              trackingNumber: order.tracking_number,
              previousStatus: order.status,
              newStatus: null,
              error: updateError.message,
            })
          } else {
            updatedCount++
            results.push({
              orderId: order.id,
              trackingNumber: order.tracking_number,
              previousStatus: order.status,
              newStatus,
            })
          }
        } else {
          results.push({
            orderId: order.id,
            trackingNumber: order.tracking_number,
            previousStatus: order.status,
            newStatus: order.status,
          })
        }

        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          orderId: order.id,
          trackingNumber: order.tracking_number,
          previousStatus: order.status,
          newStatus: null,
          error: errorMessage,
        })
      }
    }

    return NextResponse.json({
      message: 'Delivery check completed',
      currentKSTHour,
      activeStores: activeStoreIds.length,
      checked: checkedCount,
      updated: updatedCount,
      results,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[check-delivery] Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
