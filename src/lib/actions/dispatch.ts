'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NaverCommerceClient, NAVER_DELIVERY_COMPANIES } from '@/lib/naver/client'
import type { OrderStatus } from '@/types/database.types'

interface NaverApiConfig {
  naverClientId?: string
  naverClientSecret?: string
}

export interface DispatchOrder {
  id: string
  platformOrderId: string
  naverProductOrderId: string | null
  productName: string
  productOption: string | null
  customerName: string
  receiverName: string | null
  receiverTel: string | null
  receiverAddress: string | null
  zipCode: string | null
  deliveryMemo: string | null
  quantity: number
  totalAmount: number
  status: OrderStatus
  trackingNumber: string | null
  courierCode: string | null
  orderDate: string
}

export interface CourierOption {
  id: string
  name: string
  code: string
  isDefault: boolean
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

export async function getOrdersForDispatch(): Promise<{
  data: DispatchOrder[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: [], error: null }
  }

  const storeIds = stores.map(s => s.id)

  // 발주확인 완료(Ordered) 상태이고 운송장이 없는 주문 + 운송장 있지만 발송처리 안된 주문
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .in('store_id', storeIds)
    .in('status', ['Ordered', 'New'])
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const mappedOrders: DispatchOrder[] = (orders || []).map(order => ({
    id: order.id,
    platformOrderId: order.platform_order_id || '',
    naverProductOrderId: order.naver_product_order_id,
    productName: order.product_name || '상품명 없음',
    productOption: order.product_option,
    customerName: order.customer_name || '주문자 없음',
    receiverName: order.receiver_name,
    receiverTel: order.receiver_tel,
    receiverAddress: order.customer_address,
    zipCode: order.zip_code,
    deliveryMemo: order.delivery_memo,
    quantity: order.quantity,
    totalAmount: order.total_payment_amount || 0,
    status: order.status as OrderStatus,
    trackingNumber: order.tracking_number,
    courierCode: order.courier_code,
    orderDate: order.order_date,
  }))

  return { data: mappedOrders, error: null }
}

export async function getCouriersForDispatch(): Promise<{
  data: CourierOption[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data: couriers, error } = await supabase
    .from('couriers')
    .select('id, name, code, is_default')
    .eq('user_id', userData.user.id)
    .order('is_default', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  // 사용자가 등록한 택배사가 없으면 기본 목록 제공
  if (!couriers || couriers.length === 0) {
    return {
      data: NAVER_DELIVERY_COMPANIES.map((c, idx) => ({
        id: c.code,
        name: c.name,
        code: c.code,
        isDefault: idx === 0,
      })),
      error: null,
    }
  }

  return {
    data: couriers.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      isDefault: c.is_default,
    })),
    error: null,
  }
}

export async function updateOrderTrackingNumber(
  orderId: string,
  trackingNumber: string,
  courierCode: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      courier_code: courierCode,
    })
    .eq('id', orderId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/orders/dispatch')
  return { success: true, error: null }
}

export async function bulkUpdateTrackingNumbers(
  updates: Array<{ orderId: string; trackingNumber: string; courierCode: string }>
): Promise<{ success: boolean; updatedCount: number; error: string | null }> {
  const supabase = await createClient()
  let updatedCount = 0

  for (const update of updates) {
    const { error } = await supabase
      .from('orders')
      .update({
        tracking_number: update.trackingNumber,
        courier_code: update.courierCode,
      })
      .eq('id', update.orderId)

    if (!error) {
      updatedCount++
    }
  }

  revalidatePath('/orders/dispatch')
  return { success: true, updatedCount, error: null }
}

export async function dispatchOrdersToNaver(
  orderIds: string[],
  testMode: boolean = false
): Promise<{
  success: boolean
  results: Array<{
    orderId: string
    success: boolean
    error?: string
  }>
  error: string | null
}> {
  if (testMode) {
    // 테스트 모드: 실제 API 호출 없이 시뮬레이션
    const supabase = await createClient()
    const results: Array<{ orderId: string; success: boolean; error?: string }> = []

    for (const orderId of orderIds) {
      const { data: order } = await supabase
        .from('orders')
        .select('tracking_number, courier_code')
        .eq('id', orderId)
        .single()

      if (!order?.tracking_number || !order?.courier_code) {
        results.push({
          orderId,
          success: false,
          error: '운송장 번호 또는 택배사 정보가 없습니다.',
        })
        continue
      }

      // 테스트 모드에서는 DB 상태만 업데이트
      await supabase
        .from('orders')
        .update({ status: 'Dispatched' as OrderStatus })
        .eq('id', orderId)

      results.push({ orderId, success: true })
    }

    revalidatePath('/orders/dispatch')
    revalidatePath('/orders')
    return { success: true, results, error: null }
  }

  // 실제 API 호출
  const { client, error: clientError } = await getNaverClient()
  if (!client || clientError) {
    return { success: false, results: [], error: clientError }
  }

  const supabase = await createClient()
  const results: Array<{ orderId: string; success: boolean; error?: string }> = []

  for (const orderId of orderIds) {
    const { data: order } = await supabase
      .from('orders')
      .select('naver_product_order_id, tracking_number, courier_code')
      .eq('id', orderId)
      .single()

    if (!order) {
      results.push({ orderId, success: false, error: '주문을 찾을 수 없습니다.' })
      continue
    }

    if (!order.naver_product_order_id) {
      results.push({ orderId, success: false, error: '네이버 주문 ID가 없습니다.' })
      continue
    }

    if (!order.tracking_number || !order.courier_code) {
      results.push({ orderId, success: false, error: '운송장 번호 또는 택배사 정보가 없습니다.' })
      continue
    }

    try {
      const response = await client.registerShipment({
        productOrderId: order.naver_product_order_id,
        deliveryCompanyCode: order.courier_code,
        trackingNumber: order.tracking_number,
      })

      if (response.data.failProductOrderInfos.length > 0) {
        const failInfo = response.data.failProductOrderInfos[0]
        results.push({ orderId, success: false, error: failInfo.message })
      } else {
        await supabase
          .from('orders')
          .update({ status: 'Dispatched' as OrderStatus })
          .eq('id', orderId)
        results.push({ orderId, success: true })
      }
    } catch (err) {
      results.push({
        orderId,
        success: false,
        error: err instanceof Error ? err.message : '발송처리 중 오류 발생',
      })
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  revalidatePath('/orders/dispatch')
  revalidatePath('/orders')

  const successCount = results.filter(r => r.success).length
  return {
    success: successCount > 0,
    results,
    error: successCount === 0 ? '모든 주문 발송처리에 실패했습니다.' : null,
  }
}

export async function downloadOrdersExcel(): Promise<{
  data: string | null  // base64 encoded
  filename: string
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, filename: '', error: '로그인이 필요합니다.' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: null, filename: '', error: '스토어가 없습니다.' }
  }

  const storeIds = stores.map(s => s.id)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .in('store_id', storeIds)
    .in('status', ['Ordered', 'New'])
    .is('tracking_number', null)
    .order('order_date', { ascending: false })

  if (error) {
    return { data: null, filename: '', error: error.message }
  }

  // CSV 형식으로 생성 (간단한 버전)
  const headers = ['주문번호', '상품명', '옵션', '수량', '수령인', '연락처', '우편번호', '주소', '배송메모', '운송장번호']
  const rows = (orders || []).map(order => [
    order.platform_order_id || '',
    order.product_name || '',
    order.product_option || '',
    String(order.quantity || 1),
    order.receiver_name || order.customer_name || '',
    order.receiver_tel || '',
    order.zip_code || '',
    order.customer_address || '',
    order.delivery_memo || '',
    '', // 운송장번호 (입력용 빈칸)
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const base64 = Buffer.from('\uFEFF' + csvContent, 'utf-8').toString('base64')

  const today = new Date().toISOString().split('T')[0]
  return {
    data: base64,
    filename: `발송대기_주문_${today}.csv`,
    error: null,
  }
}

export async function uploadTrackingExcel(
  formData: FormData
): Promise<{
  success: boolean
  updatedCount: number
  errors: string[]
}> {
  const file = formData.get('file') as File
  if (!file) {
    return { success: false, updatedCount: 0, errors: ['파일이 없습니다.'] }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, updatedCount: 0, errors: ['로그인이 필요합니다.'] }
  }

  try {
    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    
    if (lines.length < 2) {
      return { success: false, updatedCount: 0, errors: ['데이터가 없습니다.'] }
    }

    // 헤더 스킵하고 데이터 파싱
    const dataLines = lines.slice(1)
    let updatedCount = 0
    const errors: string[] = []

    for (const line of dataLines) {
      // CSV 파싱 (간단한 버전)
      const cells = line.split(',').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
      
      const platformOrderId = cells[0]
      const trackingNumber = cells[9] // 마지막 컬럼

      if (!platformOrderId || !trackingNumber) {
        continue // 운송장 없으면 스킵
      }

      const { error } = await supabase
        .from('orders')
        .update({ tracking_number: trackingNumber })
        .eq('platform_order_id', platformOrderId)

      if (error) {
        errors.push(`${platformOrderId}: ${error.message}`)
      } else {
        updatedCount++
      }
    }

    revalidatePath('/orders/dispatch')
    return { success: updatedCount > 0, updatedCount, errors }
  } catch (err) {
    return {
      success: false,
      updatedCount: 0,
      errors: [err instanceof Error ? err.message : '파일 처리 중 오류'],
    }
  }
}

export async function createTestOrders(count: number = 3): Promise<{
  success: boolean
  createdCount: number
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, createdCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { success: false, createdCount: 0, error: '스토어를 먼저 등록해주세요.' }
  }

  const testProducts = [
    '테스트 상품 A - 블랙 / M',
    '테스트 상품 B - 화이트 / L',
    '테스트 상품 C - 네이비 / XL',
    '테스트 상품 D - 그레이 / S',
    '테스트 상품 E - 베이지 / Free',
  ]

  const testCustomers = [
    { name: '홍길동', tel: '010-1234-5678', address: '서울시 강남구 테헤란로 123', zipCode: '06234' },
    { name: '김철수', tel: '010-2345-6789', address: '경기도 성남시 분당구 판교로 456', zipCode: '13494' },
    { name: '이영희', tel: '010-3456-7890', address: '부산시 해운대구 해운대로 789', zipCode: '48094' },
  ]

  let createdCount = 0

  for (let i = 0; i < count; i++) {
    const product = testProducts[i % testProducts.length]
    const customer = testCustomers[i % testCustomers.length]
    const orderId = `TEST-${Date.now()}-${i + 1}`

    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      platform_order_id: orderId,
      naver_product_order_id: `NAVER-${orderId}`, // 테스트용 가짜 네이버 주문 ID
      product_name: product.split(' - ')[0],
      product_option: product.split(' - ')[1] || null,
      customer_name: customer.name,
      receiver_name: customer.name,
      receiver_tel: customer.tel,
      customer_address: customer.address,
      zip_code: customer.zipCode,
      quantity: Math.floor(Math.random() * 3) + 1,
      unit_price: Math.floor(Math.random() * 50000) + 10000,
      total_payment_amount: Math.floor(Math.random() * 100000) + 20000,
      status: 'Ordered' as OrderStatus,
      order_date: new Date().toISOString(),
      delivery_memo: i % 2 === 0 ? '부재시 경비실에 맡겨주세요' : null,
    })

    if (!error) {
      createdCount++
    }
  }

  revalidatePath('/orders/dispatch')
  revalidatePath('/orders')

  return { success: createdCount > 0, createdCount, error: null }
}

export async function deleteTestOrders(): Promise<{
  success: boolean
  deletedCount: number
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, deletedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { success: false, deletedCount: 0, error: '스토어가 없습니다.' }
  }

  const storeIds = stores.map(s => s.id)

  const { data: testOrders } = await supabase
    .from('orders')
    .select('id')
    .in('store_id', storeIds)
    .like('platform_order_id', 'TEST-%')

  if (!testOrders || testOrders.length === 0) {
    return { success: true, deletedCount: 0, error: null }
  }

  const orderIds = testOrders.map(o => o.id)

  const { error } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds)

  if (error) {
    return { success: false, deletedCount: 0, error: error.message }
  }

  revalidatePath('/orders/dispatch')
  revalidatePath('/orders')

  return { success: true, deletedCount: testOrders.length, error: null }
}
