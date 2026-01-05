'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import type { OrderStatus } from '@/types/database.types'

interface ProductRow {
  name: string
  price: number
  stock_quantity: number
  sku?: string
}

interface OrderRow {
  platform_order_id?: string
  customer_name: string
  customer_address?: string
  quantity: number
  status?: OrderStatus
  order_date?: string
}

export async function uploadProductsFromExcel(
  formData: FormData
): Promise<{ success: boolean; importedCount: number; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, importedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { success: false, importedCount: 0, error: '스토어 설정을 먼저 완료해주세요.' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, importedCount: 0, error: '파일을 선택해주세요.' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

    if (jsonData.length === 0) {
      return { success: false, importedCount: 0, error: '엑셀 파일에 데이터가 없습니다.' }
    }

    const products: ProductRow[] = jsonData.map((row) => ({
      name: String(row['상품명'] || row['name'] || ''),
      price: Number(row['가격'] || row['price'] || 0),
      stock_quantity: Number(row['재고'] || row['stock_quantity'] || row['재고수량'] || 0),
      sku: row['SKU'] || row['sku'] ? String(row['SKU'] || row['sku']) : undefined,
    }))

    const validProducts = products.filter((p) => p.name && p.price > 0)

    if (validProducts.length === 0) {
      return { success: false, importedCount: 0, error: '유효한 상품 데이터가 없습니다. 필수 컬럼: 상품명, 가격' }
    }

    let importedCount = 0
    for (const product of validProducts) {
      const { error } = await supabase.from('products').insert({
        store_id: store.id,
        name: product.name,
        price: product.price,
        stock_quantity: product.stock_quantity,
        sku: product.sku || null,
      })

      if (!error) {
        importedCount++
      }
    }

    revalidatePath('/inventory')
    return { success: true, importedCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '엑셀 파일 처리 중 오류가 발생했습니다.'
    return { success: false, importedCount: 0, error: message }
  }
}

export async function uploadOrdersFromExcel(
  formData: FormData
): Promise<{ success: boolean; importedCount: number; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, importedCount: 0, error: '로그인이 필요합니다.' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { success: false, importedCount: 0, error: '스토어 설정을 먼저 완료해주세요.' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, importedCount: 0, error: '파일을 선택해주세요.' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

    if (jsonData.length === 0) {
      return { success: false, importedCount: 0, error: '엑셀 파일에 데이터가 없습니다.' }
    }

    const orders: OrderRow[] = jsonData.map((row) => ({
      platform_order_id: row['주문번호'] || row['platform_order_id'] 
        ? String(row['주문번호'] || row['platform_order_id']) 
        : undefined,
      customer_name: String(row['고객명'] || row['customer_name'] || ''),
      customer_address: row['주소'] || row['customer_address'] 
        ? String(row['주소'] || row['customer_address']) 
        : undefined,
      quantity: Number(row['수량'] || row['quantity'] || 1),
      status: parseOrderStatus(row['상태'] || row['status']),
      order_date: parseOrderDate(row['주문일'] || row['order_date']),
    }))

    const validOrders = orders.filter((o) => o.customer_name)

    if (validOrders.length === 0) {
      return { success: false, importedCount: 0, error: '유효한 주문 데이터가 없습니다. 필수 컬럼: 고객명' }
    }

    let importedCount = 0
    for (const order of validOrders) {
      const { error } = await supabase.from('orders').insert({
        store_id: store.id,
        platform_order_id: order.platform_order_id || null,
        customer_name: order.customer_name,
        customer_address: order.customer_address || null,
        quantity: order.quantity,
        status: order.status || 'New',
        order_date: order.order_date || new Date().toISOString(),
      })

      if (!error) {
        importedCount++
      }
    }

    revalidatePath('/orders')
    revalidatePath('/dashboard')
    return { success: true, importedCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : '엑셀 파일 처리 중 오류가 발생했습니다.'
    return { success: false, importedCount: 0, error: message }
  }
}

function parseOrderStatus(value: unknown): OrderStatus {
  if (!value) return 'New'
  const str = String(value).toLowerCase()
  if (str.includes('new') || str.includes('신규') || str.includes('대기')) return 'New'
  if (str.includes('order') || str.includes('주문') || str.includes('확인')) return 'Ordered'
  if (str.includes('ship') || str.includes('배송') || str.includes('발송')) return 'Shipped'
  if (str.includes('cancel') || str.includes('취소')) return 'Cancelled'
  return 'New'
}

function parseOrderDate(value: unknown): string {
  if (!value) return new Date().toISOString()
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return new Date(date.y, date.m - 1, date.d).toISOString()
  }
  
  const str = String(value)
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }
  
  return new Date().toISOString()
}

export async function generateProductTemplate(): Promise<string> {
  const workbook = XLSX.utils.book_new()
  const data = [
    ['상품명', '가격', '재고', 'SKU'],
    ['예시 상품 1', 10000, 100, 'SKU-001'],
    ['예시 상품 2', 25000, 50, 'SKU-002'],
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, '상품목록')
  const buffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
  return buffer
}

export async function generateOrderTemplate(): Promise<string> {
  const workbook = XLSX.utils.book_new()
  const data = [
    ['주문번호', '고객명', '주소', '수량', '상태', '주문일'],
    ['ORD-001', '홍길동', '서울시 강남구', 2, '신규', '2024-01-15'],
    ['ORD-002', '김철수', '부산시 해운대구', 1, '주문확인', '2024-01-16'],
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, '주문목록')
  const buffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
  return buffer
}
