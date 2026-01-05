'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NaverCommerceClient, type NaverOrder } from '@/lib/naver/client'
import type { OrderStatus } from '@/types/database.types'

interface NaverApiConfig {
  naverClientId?: string
  naverClientSecret?: string
}

async function getNaverClient(): Promise<{ client: NaverCommerceClient | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { client: null, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('api_config')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { client: null, error: '스토어 설정을 먼저 완료해주세요.' }
  }

  const apiConfig = (store.api_config || {}) as NaverApiConfig

  if (!apiConfig.naverClientId || !apiConfig.naverClientSecret) {
    return { client: null, error: '네이버 API 키를 설정해주세요.' }
  }

  const client = new NaverCommerceClient({
    clientId: apiConfig.naverClientId,
    clientSecret: apiConfig.naverClientSecret,
  })

  return { client, error: null }
}

export async function syncNaverOrders(params: {
  fromDate?: string
  toDate?: string
}): Promise<{ success: boolean; syncedCount: number; error: string | null }> {
  console.log('[syncNaverOrders] Starting sync...')
  
  const { client, error } = await getNaverClient()
  if (!client || error) {
    console.log('[syncNaverOrders] Client error:', error)
    return { success: false, syncedCount: 0, error }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    console.log('[syncNaverOrders] No user found')
    return { success: false, syncedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    console.log('[syncNaverOrders] No store found')
    return { success: false, syncedCount: 0, error: '스토어를 찾을 수 없습니다.' }
  }

  try {
    const now = new Date()
    const daysToSync = 7
    let syncedCount = 0
    const allOrders: NaverOrder[] = []

    for (let i = 0; i < daysToSync; i++) {
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000)

      console.log(`[syncNaverOrders] Fetching day ${i + 1}/${daysToSync}: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`)

      try {
        const response = await client.getOrders({
          fromDate: dayStart.toISOString(),
          toDate: dayEnd.toISOString(),
        })

        const orders = response.data?.contents || []
        console.log(`[syncNaverOrders] Day ${i + 1}: ${orders.length} orders found`)
        allOrders.push(...orders)
      } catch (dayError) {
        console.log(`[syncNaverOrders] Day ${i + 1} error:`, dayError)
      }

      if (i < daysToSync - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log('[syncNaverOrders] Total orders fetched:', allOrders.length)

    for (const naverOrder of allOrders) {
      const orderData = mapNaverOrderToDb(naverOrder, store.id)
      
      const { error: upsertError } = await supabase
        .from('orders')
        .upsert(orderData, {
          onConflict: 'platform_order_id',
        })

      if (upsertError) {
        console.log('[syncNaverOrders] Upsert error:', upsertError)
      } else {
        syncedCount++
      }
    }

    revalidatePath('/orders')
    revalidatePath('/dashboard')

    console.log('[syncNaverOrders] Sync complete. Count:', syncedCount)
    return { success: true, syncedCount, error: null }
  } catch (err) {
    console.error('[syncNaverOrders] Error:', err)
    const message = err instanceof Error ? err.message : '주문 동기화 중 오류가 발생했습니다.'
    return { success: false, syncedCount: 0, error: message }
  }
}

export async function syncNaverProducts(): Promise<{ success: boolean; syncedCount: number; error: string | null }> {
  console.log('[syncNaverProducts] Starting sync...')
  
  const { client, error } = await getNaverClient()
  if (!client || error) {
    console.log('[syncNaverProducts] Client error:', error)
    return { success: false, syncedCount: 0, error }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    console.log('[syncNaverProducts] No user found')
    return { success: false, syncedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    console.log('[syncNaverProducts] No store found')
    return { success: false, syncedCount: 0, error: '스토어를 찾을 수 없습니다.' }
  }

  try {
    console.log('[syncNaverProducts] Fetching all products...')
    const response = await client.searchProducts({ 
      pageSize: 100,
      productStatusTypes: ['SALE', 'SUSPENSION', 'WAIT', 'UNADMISSION', 'REJECTION', 'PROHIBITION']
    })
    console.log('[syncNaverProducts] API Response:', JSON.stringify(response, null, 2))
    
    const products = response.contents || []
    console.log('[syncNaverProducts] Products count:', products.length)
    
    let syncedCount = 0

    for (const naverProduct of products) {
      const channelProduct = naverProduct.channelProducts?.[0]
      if (!channelProduct) {
        console.log('[syncNaverProducts] No channel product for:', naverProduct.originProductNo)
        continue
      }

      const sku = channelProduct.sellerManagementCode || `NAVER-${naverProduct.originProductNo}`
      const platformProductId = String(naverProduct.originProductNo)
      
      console.log('[syncNaverProducts] Processing:', channelProduct.name, '| Status:', channelProduct.statusType)

      const productData = {
        name: channelProduct.name,
        price: channelProduct.discountedPrice || channelProduct.salePrice,
        stock_quantity: channelProduct.stockQuantity,
        status: channelProduct.statusType,
        platform_product_id: platformProductId,
        image_url: channelProduct.representativeImage?.url || null,
        category: channelProduct.wholeCategoryName || null,
        brand: channelProduct.brandName || null,
        updated_at: new Date().toISOString(),
      }

      let existingProductId: string | null = null

      const { data: byPlatformId } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store.id)
        .eq('platform_product_id', platformProductId)
        .single()

      if (byPlatformId) {
        existingProductId = byPlatformId.id
      } else {
        const { data: bySku } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', store.id)
          .eq('sku', sku)
          .single()
        
        if (bySku) {
          existingProductId = bySku.id
        }
      }

      if (existingProductId) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', existingProductId)

        if (updateError) {
          console.log('[syncNaverProducts] Update error:', updateError)
        } else {
          syncedCount++
        }
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            store_id: store.id,
            sku,
            ...productData,
          })

        if (insertError) {
          console.log('[syncNaverProducts] Insert error:', insertError)
        } else {
          syncedCount++
        }
      }
    }

    revalidatePath('/inventory')
    revalidatePath('/dashboard')

    console.log('[syncNaverProducts] Sync complete. Count:', syncedCount)
    return { success: true, syncedCount, error: null }
  } catch (err) {
    console.error('[syncNaverProducts] Error:', err)
    const message = err instanceof Error ? err.message : '상품 동기화 중 오류가 발생했습니다.'
    return { success: false, syncedCount: 0, error: message }
  }
}

export async function registerShipment(params: {
  orderId: string
  platformOrderId: string
  deliveryCompanyCode: string
  trackingNumber: string
}): Promise<{ success: boolean; error: string | null }> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, error }
  }

  const supabase = await createClient()

  try {
    const response = await client.registerShipment({
      productOrderId: params.platformOrderId,
      deliveryCompanyCode: params.deliveryCompanyCode,
      trackingNumber: params.trackingNumber,
    })

    if (response.data.failProductOrderInfos.length > 0) {
      const failInfo = response.data.failProductOrderInfos[0]
      return { success: false, error: `송장 등록 실패: ${failInfo.message}` }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: params.trackingNumber,
        courier_code: params.deliveryCompanyCode,
        status: 'Shipped' as OrderStatus,
      })
      .eq('id', params.orderId)

    if (updateError) {
      return { success: false, error: `로컬 DB 업데이트 실패: ${updateError.message}` }
    }

    revalidatePath('/orders')
    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '송장 등록 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

export async function testNaverConnection(): Promise<{ success: boolean; error: string | null }> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, error }
  }

  try {
    await client.getAccessToken()
    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '연결 테스트 실패'
    return { success: false, error: message }
  }
}

function mapNaverOrderStatusToDb(naverStatus: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'PAYMENT_WAITING': 'New',
    'PAYED': 'New',
    'DELIVERING': 'Shipped',
    'DELIVERED': 'Shipped',
    'PURCHASE_DECIDED': 'Shipped',
    'EXCHANGED': 'Cancelled',
    'CANCELED': 'Cancelled',
    'RETURNED': 'Cancelled',
    'CANCELED_BY_NOPAYMENT': 'Cancelled',
  }
  return statusMap[naverStatus] || 'New'
}

function mapNaverOrderToDb(naverOrder: NaverOrder, storeId: string) {
  const address = naverOrder.shippingAddress 
    ? `${naverOrder.shippingAddress.baseAddress} ${naverOrder.shippingAddress.detailAddress}`
    : null

  return {
    store_id: storeId,
    platform_order_id: naverOrder.productOrderId,
    customer_name: naverOrder.ordererName,
    customer_address: address,
    quantity: naverOrder.quantity,
    status: mapNaverOrderStatusToDb(naverOrder.orderStatus),
    tracking_number: naverOrder.trackingNumber || null,
    courier_code: naverOrder.deliveryCompanyCode || null,
    order_date: naverOrder.orderDate,
  }
}


