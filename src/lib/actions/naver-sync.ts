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

    const { data: existingSchedule } = await supabase
      .from('sync_schedules')
      .select('id')
      .eq('store_id', store.id)
      .eq('sync_type', 'orders')
      .single()

    if (existingSchedule) {
      await supabase
        .from('sync_schedules')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', existingSchedule.id)
    } else {
      await supabase
        .from('sync_schedules')
        .insert({
          user_id: userData.user.id,
          store_id: store.id,
          sync_type: 'orders' as const,
          last_sync_at: new Date().toISOString(),
          interval_minutes: 30,
          is_enabled: false,
        })
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
  const shipping = naverOrder.shippingAddress
  const address = shipping
    ? `${shipping.baseAddress} ${shipping.detailAddress}`
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
    naver_product_order_id: naverOrder.productOrderId,
    unit_price: naverOrder.unitPrice,
    total_payment_amount: naverOrder.totalPaymentAmount,
    naver_order_status: naverOrder.orderStatus,
    orderer_tel: naverOrder.ordererTel,
    product_name: naverOrder.productName,
    product_option: naverOrder.productOption || null,
    receiver_name: shipping?.name || null,
    receiver_tel: shipping?.tel1 || null,
    zip_code: shipping?.zipCode || null,
    naver_order_id: naverOrder.orderId,
    delivery_memo: naverOrder.shippingMemo || null,
  }
}

export async function confirmNaverOrders(orderIds: string[]): Promise<{ 
  success: boolean
  confirmedCount: number 
  error: string | null 
}> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, confirmedCount: 0, error }
  }

  const supabase = await createClient()

  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, platform_order_id')
      .in('id', orderIds)

    if (!orders || orders.length === 0) {
      return { success: false, confirmedCount: 0, error: '주문을 찾을 수 없습니다.' }
    }

    const platformOrderIds = orders
      .map(o => o.platform_order_id)
      .filter((id): id is string => id !== null)

    const response = await client.confirmOrders(platformOrderIds)

    const successCount = response.data.successProductOrderInfos.length
    const successIds = response.data.successProductOrderInfos.map(s => s.productOrderId)

    if (successIds.length > 0) {
      await supabase
        .from('orders')
        .update({ status: 'Ordered' as OrderStatus })
        .in('platform_order_id', successIds)
    }

    revalidatePath('/orders')

    if (response.data.failProductOrderInfos.length > 0) {
      const failMessage = response.data.failProductOrderInfos
        .map(f => f.message)
        .join(', ')
      return { 
        success: successCount > 0, 
        confirmedCount: successCount, 
        error: `일부 실패: ${failMessage}` 
      }
    }

    return { success: true, confirmedCount: successCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '발주 확인 중 오류가 발생했습니다.'
    return { success: false, confirmedCount: 0, error: message }
  }
}

export async function syncStockToNaver(productId: string): Promise<{
  success: boolean
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, error }
  }

  const supabase = await createClient()

  interface ProductWithNaverFields {
    id: string
    stock_quantity: number
    naver_origin_product_no: number | null
    platform_product_id: string | null
  }

  try {
    const { data: rawProduct } = await supabase
      .from('products')
      .select('id, stock_quantity, platform_product_id')
      .eq('id', productId)
      .single()

    if (!rawProduct) {
      return { success: false, error: '상품을 찾을 수 없습니다.' }
    }

    const product = rawProduct as unknown as ProductWithNaverFields

    const originProductNo = product.naver_origin_product_no || 
      (product.platform_product_id ? parseInt(product.platform_product_id) : null)

    if (!originProductNo) {
      return { success: false, error: '네이버 상품 번호가 없습니다.' }
    }

    await client.updateStock(originProductNo, product.stock_quantity)

    revalidatePath('/inventory')
    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '재고 동기화 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

export async function syncAllStockToNaver(): Promise<{
  success: boolean
  syncedCount: number
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, syncedCount: 0, error }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, syncedCount: 0, error: '로그인이 필요합니다.' }
  }

  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userData.user.id)

    if (!stores || stores.length === 0) {
      return { success: false, syncedCount: 0, error: '스토어를 찾을 수 없습니다.' }
    }

    const storeIds = stores.map(s => s.id)

    interface ProductWithNaverFields {
      id: string
      stock_quantity: number
      naver_origin_product_no: number | null
      platform_product_id: string | null
    }

    const { data: rawProducts } = await supabase
      .from('products')
      .select('id, stock_quantity, platform_product_id')
      .in('store_id', storeIds)
      .not('platform_product_id', 'is', null)

    if (!rawProducts || rawProducts.length === 0) {
      return { success: true, syncedCount: 0, error: null }
    }

    const products = rawProducts as unknown as ProductWithNaverFields[]
    let syncedCount = 0

    for (const product of products) {
      const originProductNo = product.naver_origin_product_no || 
        (product.platform_product_id ? parseInt(product.platform_product_id) : null)

      if (!originProductNo) continue

      try {
        await client.updateStock(originProductNo, product.stock_quantity)
        syncedCount++
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`Stock sync failed for product ${product.id}:`, e)
      }
    }

    revalidatePath('/inventory')
    return { success: true, syncedCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '재고 동기화 중 오류가 발생했습니다.'
    return { success: false, syncedCount: 0, error: message }
  }
}

export interface NaverOptionItem {
  id?: number
  optionName1: string
  optionName2?: string
  optionName3?: string
  optionName4?: string
  stockQuantity: number
  price: number
  sellerManagerCode?: string
  usable?: boolean
}

export interface NaverSimpleOption {
  id?: number
  groupName?: string
  name?: string
  usable?: boolean
}

export interface NaverSupplementProduct {
  id?: number
  groupName?: string
  name?: string
  price?: number
  stockQuantity?: number
  sellerManagementCode?: string
  usable?: boolean
}

export interface NaverProductInfoNoticeData {
  productInfoProvidedNoticeType?: string
  [key: string]: unknown
}

export interface NaverProductFullDetail {
  originProductNo: number
  name: string
  salePrice: number
  stockQuantity: number
  detailContent: string
  
  saleType?: string
  statusType?: string
  
  productAttributes?: Array<{
    attributeId: number
    attributeValueId?: number
    attributeValue?: string
  }>
  
  sellerManagementCode?: string
  sellerBarcode?: string
  sellerCustomCode1?: string
  sellerCustomCode2?: string
  
  brandName?: string
  modelName?: string
  manufacturerName?: string
  
  representativeImageUrl?: string
  optionalImageUrls?: string[]
  
  leafCategoryId?: string
  categoryId?: string
  wholeCategoryId?: string
  categoryName?: string
  
  saleStartDate?: string
  saleEndDate?: string
  channelProductDisplayStatusType?: string
  
  originAreaCode?: string
  originArea?: string
  importer?: string
  
  afterServiceTel?: string
  afterServiceGuide?: string
  
  minPurchaseQuantity?: number
  maxPurchaseQuantityPerId?: number
  maxPurchaseQuantityPerOrder?: number
  
  deliveryType?: string
  deliveryAttributeType?: string
  deliveryCompany?: string
  deliveryFeeType?: string
  baseFee?: number
  freeConditionalAmount?: number
  repeatQuantity?: number
  returnDeliveryFee?: number
  exchangeDeliveryFee?: number
  expectedDeliveryPeriodType?: string
  expectedDeliveryPeriodDirectInput?: number
  
  taxType?: string
  minorPurchasable?: boolean
  
  options?: NaverOptionItem[]
  optionGroupNames?: {
    optionGroupName1?: string
    optionGroupName2?: string
    optionGroupName3?: string
    optionGroupName4?: string
  }
  useStockManagement?: boolean
  optionCombinationSortType?: string
  
  simpleOptions?: NaverSimpleOption[]
  customOptions?: NaverSimpleOption[]
  
  supplementProducts?: NaverSupplementProduct[]
  
  productInfoProvidedNotice?: NaverProductInfoNoticeData
  
  seoPageTitle?: string
  seoMetaDescription?: string
  sellerTags?: Array<{ code?: number; text?: string }>
  
  discountValue?: number
  discountUnitType?: string
  mobileDiscountValue?: number
  mobileDiscountUnitType?: string
  purchasePointValue?: number
  purchasePointUnitType?: string
  textReviewPoint?: number
  photoVideoReviewPoint?: number
  giftName?: string
  
  eventPhraseContent?: string
  eventPhraseEnabled?: boolean
  
  naverCatalogId?: string
  naverModelNo?: string
  manufacturerDate?: string
  brandCertificationYn?: boolean
  
  certifications?: Array<{
    certificationInfoId?: number
    certificationKindType?: string
    name?: string
    certificationNumber?: string
    companyName?: string
    certificationDate?: string
  }>
  
  kcExemptionType?: string
}

export async function getProductDetailFromNaver(productId: string): Promise<{
  data: NaverProductFullDetail | null
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { data: null, error }
  }

  const supabase = await createClient()

  interface ProductNaverInfo {
    naver_origin_product_no: number | null
    platform_product_id: string | null
    category: string | null
  }

  try {
    const { data: rawProduct } = await supabase
      .from('products')
      .select('platform_product_id, category')
      .eq('id', productId)
      .single()

    if (!rawProduct) {
      return { data: null, error: '상품을 찾을 수 없습니다.' }
    }

    const product = rawProduct as unknown as ProductNaverInfo
    const dbCategoryName = product.category

    const originProductNo = product.naver_origin_product_no || 
      (product.platform_product_id ? parseInt(product.platform_product_id) : null)

    if (!originProductNo) {
      return { data: null, error: '네이버 상품 번호가 없습니다.' }
    }

    const response = await client.getProductDetail(originProductNo)
    const d = response.originProduct
    const attr = d.detailAttribute
    const delivery = d.deliveryInfo
    const benefit = d.customerBenefit
    const images = d.images
    const naverSearchInfo = attr?.naverShoppingSearchInfo

    return {
      data: {
        originProductNo: d.originProductNo,
        name: d.name,
        salePrice: d.salePrice,
        stockQuantity: d.stockQuantity,
        detailContent: d.detailContent || '',
        
        saleType: d.saleType,
        statusType: d.statusType,
        productAttributes: d.productAttributes,
        
        sellerManagementCode: d.sellerManagementCode || attr?.sellerCodeInfo?.sellerManagementCode,
        sellerBarcode: attr?.sellerCodeInfo?.sellerBarcode,
        sellerCustomCode1: attr?.sellerCodeInfo?.sellerCustomCode1,
        sellerCustomCode2: attr?.sellerCodeInfo?.sellerCustomCode2,
        
        brandName: naverSearchInfo?.brandName || d.brandName,
        modelName: naverSearchInfo?.modelName || d.modelName,
        manufacturerName: naverSearchInfo?.manufacturerName || d.manufacturerName,
        
        representativeImageUrl: images?.representativeImage?.url || d.representativeImage?.url,
        optionalImageUrls: images?.optionalImages?.map(img => img.url) || d.optionalImages?.map(img => img.url),
        
        leafCategoryId: d.leafCategoryId,
        categoryId: d.category?.categoryId,
        wholeCategoryId: d.category?.wholeCategoryId,
        categoryName: d.category?.wholeCategoryName || dbCategoryName || undefined,
        
        saleStartDate: d.saleStartDate,
        saleEndDate: d.saleEndDate,
        channelProductDisplayStatusType: d.channelProductDisplayStatusType,
        
        originAreaCode: d.originAreaInfo?.originAreaCode || attr?.originAreaInfo?.originAreaCode,
        originArea: d.originAreaInfo?.content || attr?.originAreaInfo?.content,
        importer: d.originAreaInfo?.importer || attr?.originAreaInfo?.importer,
        
        afterServiceTel: attr?.afterServiceInfo?.afterServiceTelephoneNumber,
        afterServiceGuide: attr?.afterServiceInfo?.afterServiceGuideContent,
        
        minPurchaseQuantity: attr?.purchaseQuantityInfo?.minPurchaseQuantity,
        maxPurchaseQuantityPerId: attr?.purchaseQuantityInfo?.maxPurchaseQuantityPerId,
        maxPurchaseQuantityPerOrder: attr?.purchaseQuantityInfo?.maxPurchaseQuantityPerOrder,
        
        deliveryType: delivery?.deliveryType,
        deliveryAttributeType: delivery?.deliveryAttributeType,
        deliveryCompany: delivery?.deliveryCompany,
        deliveryFeeType: delivery?.deliveryFee?.deliveryFeeType,
        baseFee: delivery?.deliveryFee?.baseFee,
        freeConditionalAmount: delivery?.deliveryFee?.freeConditionalAmount,
        repeatQuantity: delivery?.deliveryFee?.repeatQuantity,
        returnDeliveryFee: delivery?.claimDeliveryInfo?.returnDeliveryFee,
        exchangeDeliveryFee: delivery?.claimDeliveryInfo?.exchangeDeliveryFee,
        expectedDeliveryPeriodType: delivery?.expectedDeliveryPeriodType,
        expectedDeliveryPeriodDirectInput: delivery?.expectedDeliveryPeriodDirectInput,
        
        taxType: attr?.taxType,
        minorPurchasable: attr?.minorPurchasable,
        
        options: attr?.optionInfo?.optionCombinations?.map(opt => ({
          id: opt.id,
          optionName1: opt.optionName1,
          optionName2: opt.optionName2,
          optionName3: opt.optionName3,
          optionName4: opt.optionName4,
          stockQuantity: opt.stockQuantity,
          price: opt.price,
          sellerManagerCode: opt.sellerManagerCode,
          usable: opt.usable,
        })),
        optionGroupNames: attr?.optionInfo?.optionCombinationGroupNames,
        useStockManagement: attr?.optionInfo?.useStockManagement,
        optionCombinationSortType: attr?.optionInfo?.optionCombinationSortType,
        
        simpleOptions: attr?.optionInfo?.optionSimple,
        customOptions: attr?.optionInfo?.optionCustom,
        
        supplementProducts: attr?.supplementProductInfo?.supplementProducts,
        
        productInfoProvidedNotice: attr?.productInfoProvidedNotice as NaverProductInfoNoticeData,
        
        seoPageTitle: d.seoInfo?.pageTitle,
        seoMetaDescription: d.seoInfo?.metaDescription,
        sellerTags: d.seoInfo?.sellerTags,
        
        discountValue: benefit?.immediateDiscountPolicy?.discountMethod?.value,
        discountUnitType: benefit?.immediateDiscountPolicy?.discountMethod?.unitType,
        mobileDiscountValue: benefit?.immediateDiscountPolicy?.mobileDiscountMethod?.value,
        mobileDiscountUnitType: benefit?.immediateDiscountPolicy?.mobileDiscountMethod?.unitType,
        purchasePointValue: benefit?.purchasePointPolicy?.value,
        purchasePointUnitType: benefit?.purchasePointPolicy?.unitType,
        textReviewPoint: benefit?.reviewPointPolicy?.textReviewPoint,
        photoVideoReviewPoint: benefit?.reviewPointPolicy?.photoVideoReviewPoint,
        giftName: benefit?.giftPolicy?.giftName,
        
        eventPhraseContent: attr?.eventPhrase?.eventPhraseContent,
        eventPhraseEnabled: attr?.eventPhrase?.eventPhraseEnabled,
        
        naverCatalogId: attr?.naverShoppingSearchInfo?.catalogId,
        naverModelNo: attr?.naverShoppingSearchInfo?.modelNo,
        manufacturerDate: attr?.naverShoppingSearchInfo?.manufacturerDate,
        brandCertificationYn: attr?.naverShoppingSearchInfo?.brandCertificationYn,
        
        certifications: attr?.productCertificationInfos,
        
        kcExemptionType: attr?.certificationTargetExcludeContent?.kcExemptionType,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '상품 상세 조회 중 오류가 발생했습니다.'
    return { data: null, error: message }
  }
}

export interface UpdateProductToNaverInput {
  name?: string
  salePrice?: number
  stockQuantity?: number
  detailContent?: string
  
  sellerManagementCode?: string
  sellerBarcode?: string
  sellerCustomCode1?: string
  sellerCustomCode2?: string
  
  brandName?: string
  modelName?: string
  manufacturerName?: string
  
  leafCategoryId?: string
  
  representativeImageUrl?: string
  optionalImageUrls?: string[]
  
  saleStartDate?: string
  saleEndDate?: string
  
  originAreaCode?: string
  originArea?: string
  importer?: string
  
  afterServiceTel?: string
  afterServiceGuide?: string
  
  minPurchaseQuantity?: number
  maxPurchaseQuantityPerId?: number
  maxPurchaseQuantityPerOrder?: number
  
  deliveryFeeType?: string
  baseFee?: number
  freeConditionalAmount?: number
  returnDeliveryFee?: number
  exchangeDeliveryFee?: number
  
  taxType?: string
  minorPurchasable?: boolean
  
  options?: NaverOptionItem[]
  optionGroupNames?: {
    optionGroupName1?: string
    optionGroupName2?: string
    optionGroupName3?: string
    optionGroupName4?: string
  }
  
  simpleOptions?: NaverSimpleOption[]
  supplementProducts?: NaverSupplementProduct[]
  
  productInfoProvidedNotice?: NaverProductInfoNoticeData
  
  seoPageTitle?: string
  seoMetaDescription?: string
  sellerTags?: Array<{ code?: number; text?: string }>
  
  discountValue?: number
  discountUnitType?: string
  purchasePointValue?: number
  purchasePointUnitType?: string
  textReviewPoint?: number
  photoVideoReviewPoint?: number
  giftName?: string
  
  eventPhraseContent?: string
  eventPhraseEnabled?: boolean
}

export async function updateProductDetailToNaver(
  productId: string,
  input: UpdateProductToNaverInput | string
): Promise<{ success: boolean; error: string | null }> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, error }
  }

  const supabase = await createClient()

  interface ProductNaverInfo {
    naver_origin_product_no: number | null
    platform_product_id: string | null
  }

  try {
    const { data: rawProduct } = await supabase
      .from('products')
      .select('platform_product_id')
      .eq('id', productId)
      .single()

    if (!rawProduct) {
      return { success: false, error: '상품을 찾을 수 없습니다.' }
    }

    const product = rawProduct as unknown as ProductNaverInfo

    const originProductNo = product.naver_origin_product_no || 
      (product.platform_product_id ? parseInt(product.platform_product_id) : null)

    if (!originProductNo) {
      return { success: false, error: '네이버 상품 번호가 없습니다.' }
    }

    const updateData = typeof input === 'string' 
      ? { detailContent: input }
      : input

    const requestBody: Record<string, unknown> = { originProduct: {} }
    const originProduct: Record<string, unknown> = {}
    const detailAttribute: Record<string, unknown> = {}
    const deliveryInfo: Record<string, unknown> = {}
    const customerBenefit: Record<string, unknown> = {}
    const seoInfo: Record<string, unknown> = {}

    if (updateData.name) originProduct.name = updateData.name
    if (updateData.salePrice) originProduct.salePrice = updateData.salePrice
    if (updateData.stockQuantity !== undefined) originProduct.stockQuantity = updateData.stockQuantity
    if (updateData.detailContent) originProduct.detailContent = updateData.detailContent
    if (updateData.sellerManagementCode) originProduct.sellerManagementCode = updateData.sellerManagementCode
    if (updateData.brandName) originProduct.brandName = updateData.brandName
    if (updateData.modelName) originProduct.modelName = updateData.modelName
    if (updateData.manufacturerName) originProduct.manufacturerName = updateData.manufacturerName
    if (updateData.saleStartDate) originProduct.saleStartDate = updateData.saleStartDate
    if (updateData.saleEndDate) originProduct.saleEndDate = updateData.saleEndDate
    if (updateData.leafCategoryId) originProduct.leafCategoryId = updateData.leafCategoryId

    if (updateData.representativeImageUrl) {
      originProduct.representativeImage = { url: updateData.representativeImageUrl }
    }
    if (updateData.optionalImageUrls && updateData.optionalImageUrls.length > 0) {
      originProduct.optionalImages = updateData.optionalImageUrls.map(url => ({ url }))
    }

    if (updateData.originArea || updateData.originAreaCode || updateData.importer) {
      originProduct.originAreaInfo = {
        ...(updateData.originAreaCode && { originAreaCode: updateData.originAreaCode }),
        ...(updateData.originArea && { content: updateData.originArea }),
        ...(updateData.importer && { importer: updateData.importer }),
      }
    }

    if (updateData.afterServiceTel || updateData.afterServiceGuide) {
      detailAttribute.afterServiceInfo = {
        ...(updateData.afterServiceTel && { afterServiceTelephoneNumber: updateData.afterServiceTel }),
        ...(updateData.afterServiceGuide && { afterServiceGuideContent: updateData.afterServiceGuide }),
      }
    }

    if (updateData.minPurchaseQuantity !== undefined || 
        updateData.maxPurchaseQuantityPerId !== undefined || 
        updateData.maxPurchaseQuantityPerOrder !== undefined) {
      detailAttribute.purchaseQuantityInfo = {
        ...(updateData.minPurchaseQuantity !== undefined && { minPurchaseQuantity: updateData.minPurchaseQuantity }),
        ...(updateData.maxPurchaseQuantityPerId !== undefined && { maxPurchaseQuantityPerId: updateData.maxPurchaseQuantityPerId }),
        ...(updateData.maxPurchaseQuantityPerOrder !== undefined && { maxPurchaseQuantityPerOrder: updateData.maxPurchaseQuantityPerOrder }),
      }
    }

    if (updateData.taxType) detailAttribute.taxType = updateData.taxType
    if (updateData.minorPurchasable !== undefined) detailAttribute.minorPurchasable = updateData.minorPurchasable

    if (updateData.sellerBarcode || updateData.sellerCustomCode1 || updateData.sellerCustomCode2) {
      detailAttribute.sellerCodeInfo = {
        ...(updateData.sellerBarcode && { sellerBarcode: updateData.sellerBarcode }),
        ...(updateData.sellerCustomCode1 && { sellerCustomCode1: updateData.sellerCustomCode1 }),
        ...(updateData.sellerCustomCode2 && { sellerCustomCode2: updateData.sellerCustomCode2 }),
      }
    }

    if (updateData.options && updateData.options.length > 0) {
      detailAttribute.optionInfo = {
        optionCombinations: updateData.options,
        ...(updateData.optionGroupNames && { optionCombinationGroupNames: updateData.optionGroupNames }),
      }
    }

    if (updateData.simpleOptions && updateData.simpleOptions.length > 0) {
      if (!detailAttribute.optionInfo) detailAttribute.optionInfo = {}
      ;(detailAttribute.optionInfo as Record<string, unknown>).optionSimple = updateData.simpleOptions
    }

    if (updateData.supplementProducts && updateData.supplementProducts.length > 0) {
      detailAttribute.supplementProductInfo = {
        supplementProducts: updateData.supplementProducts,
      }
    }

    if (updateData.productInfoProvidedNotice) {
      detailAttribute.productInfoProvidedNotice = updateData.productInfoProvidedNotice
    }

    if (updateData.eventPhraseContent !== undefined || updateData.eventPhraseEnabled !== undefined) {
      detailAttribute.eventPhrase = {
        ...(updateData.eventPhraseContent && { eventPhraseContent: updateData.eventPhraseContent }),
        ...(updateData.eventPhraseEnabled !== undefined && { eventPhraseEnabled: updateData.eventPhraseEnabled }),
      }
    }

    if (updateData.deliveryFeeType || updateData.baseFee !== undefined || updateData.freeConditionalAmount !== undefined) {
      deliveryInfo.deliveryFee = {
        ...(updateData.deliveryFeeType && { deliveryFeeType: updateData.deliveryFeeType }),
        ...(updateData.baseFee !== undefined && { baseFee: updateData.baseFee }),
        ...(updateData.freeConditionalAmount !== undefined && { freeConditionalAmount: updateData.freeConditionalAmount }),
      }
    }

    if (updateData.returnDeliveryFee !== undefined || updateData.exchangeDeliveryFee !== undefined) {
      deliveryInfo.claimDeliveryInfo = {
        ...(updateData.returnDeliveryFee !== undefined && { returnDeliveryFee: updateData.returnDeliveryFee }),
        ...(updateData.exchangeDeliveryFee !== undefined && { exchangeDeliveryFee: updateData.exchangeDeliveryFee }),
      }
    }

    if (updateData.discountValue !== undefined || updateData.discountUnitType) {
      customerBenefit.immediateDiscountPolicy = {
        discountMethod: {
          ...(updateData.discountValue !== undefined && { value: updateData.discountValue }),
          ...(updateData.discountUnitType && { unitType: updateData.discountUnitType }),
        },
      }
    }

    if (updateData.purchasePointValue !== undefined || updateData.purchasePointUnitType) {
      customerBenefit.purchasePointPolicy = {
        ...(updateData.purchasePointValue !== undefined && { value: updateData.purchasePointValue }),
        ...(updateData.purchasePointUnitType && { unitType: updateData.purchasePointUnitType }),
      }
    }

    if (updateData.textReviewPoint !== undefined || updateData.photoVideoReviewPoint !== undefined) {
      customerBenefit.reviewPointPolicy = {
        ...(updateData.textReviewPoint !== undefined && { textReviewPoint: updateData.textReviewPoint }),
        ...(updateData.photoVideoReviewPoint !== undefined && { photoVideoReviewPoint: updateData.photoVideoReviewPoint }),
      }
    }

    if (updateData.giftName) {
      customerBenefit.giftPolicy = { giftName: updateData.giftName }
    }

    if (updateData.seoPageTitle || updateData.seoMetaDescription || updateData.sellerTags) {
      if (updateData.seoPageTitle) seoInfo.pageTitle = updateData.seoPageTitle
      if (updateData.seoMetaDescription) seoInfo.metaDescription = updateData.seoMetaDescription
      if (updateData.sellerTags) seoInfo.sellerTags = updateData.sellerTags
    }

    if (Object.keys(detailAttribute).length > 0) originProduct.detailAttribute = detailAttribute
    if (Object.keys(deliveryInfo).length > 0) originProduct.deliveryInfo = deliveryInfo
    if (Object.keys(customerBenefit).length > 0) originProduct.customerBenefit = customerBenefit
    if (Object.keys(seoInfo).length > 0) originProduct.seoInfo = seoInfo

    requestBody.originProduct = originProduct

    await client.updateProduct(originProductNo, requestBody as { originProduct: Record<string, unknown> })

    revalidatePath('/inventory')
    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '상품 업데이트 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

export async function syncSettlements(params: {
  startDate: string
  endDate: string
}): Promise<{ success: boolean; syncedCount: number; error: string | null }> {
  const { client, error } = await getNaverClient()
  if (!client || error) {
    return { success: false, syncedCount: 0, error }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, syncedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { success: false, syncedCount: 0, error: '스토어를 찾을 수 없습니다.' }
  }

  try {
    const response = await client.getDailySettlements({
      startDate: params.startDate,
      endDate: params.endDate,
    })

    let syncedCount = 0

    for (const settlement of response.contents) {
      const settlementData = {
        store_id: store.id,
        settlement_date: settlement.settleDate,
        order_count: settlement.orderCount,
        sales_amount: settlement.salesAmount,
        commission_amount: settlement.commissionAmount,
        delivery_fee_amount: settlement.deliveryFeeAmount,
        discount_amount: settlement.discountAmount,
        settlement_amount: settlement.settleAmount,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await (supabase as unknown as { 
        from: (table: string) => { 
          upsert: (data: typeof settlementData, options: { onConflict: string }) => Promise<{ error: Error | null }> 
        } 
      }).from('settlements').upsert(settlementData, {
        onConflict: 'store_id,settlement_date',
      })

      if (!upsertError) {
        syncedCount++
      }
    }

    revalidatePath('/settlements')
    return { success: true, syncedCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '정산 동기화 중 오류가 발생했습니다.'
    return { success: false, syncedCount: 0, error: message }
  }
}

export async function getSettlements(params: {
  startDate?: string
  endDate?: string
}): Promise<{
  data: Array<{
    id: string
    settlementDate: string
    orderCount: number
    salesAmount: number
    commissionAmount: number
    deliveryFeeAmount: number
    discountAmount: number
    settlementAmount: number
    status: string
  }> | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { data: [], error: null }
  }

  interface SettlementRow {
    id: string
    settlement_date: string
    order_count: number
    sales_amount: number
    commission_amount: number
    delivery_fee_amount: number
    discount_amount: number
    settlement_amount: number
    status: string
  }

  try {
    const supabaseAny = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              gte: (col: string, val: string) => unknown
              lte: (col: string, val: string) => unknown
            } & Promise<{ data: SettlementRow[] | null; error: Error | null }>
          }
        }
      }
    }

    let baseQuery = supabaseAny
      .from('settlements')
      .select('*')
      .eq('store_id', store.id)
      .order('settlement_date', { ascending: false })

    if (params.startDate) {
      baseQuery = (baseQuery as unknown as { gte: (col: string, val: string) => typeof baseQuery }).gte('settlement_date', params.startDate)
    }
    if (params.endDate) {
      baseQuery = (baseQuery as unknown as { lte: (col: string, val: string) => typeof baseQuery }).lte('settlement_date', params.endDate)
    }

    const { data: settlements, error: queryError } = await (baseQuery as unknown as Promise<{ data: SettlementRow[] | null; error: Error | null }>)

    if (queryError) {
      return { data: null, error: queryError.message }
    }

    const typedSettlements = (settlements || []) as SettlementRow[]

    return {
      data: typedSettlements.map(s => ({
        id: s.id,
        settlementDate: s.settlement_date,
        orderCount: s.order_count,
        salesAmount: s.sales_amount,
        commissionAmount: s.commission_amount,
        deliveryFeeAmount: s.delivery_fee_amount,
        discountAmount: s.discount_amount,
        settlementAmount: s.settlement_amount,
        status: s.status,
      })),
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '정산 조회 중 오류가 발생했습니다.'
    return { data: null, error: message }
  }
}
