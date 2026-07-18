import { NextResponse } from 'next/server'
import { getCurrentNaverClient, formatCommerceError } from '@/lib/naver/current-client'

interface InflowRequest {
  days?: number
}

interface RawOrder {
  content?: {
    productOrder?: Record<string, unknown>
  }
  productName?: string
  quantity?: number
  totalPaymentAmount?: number
  inflowPath?: string
  inflowPathAdd?: string
}

function extractOrder(entry: RawOrder) {
  const product = entry.content?.productOrder || {}
  return {
    source: String(product.inflowPath || entry.inflowPath || '유입 정보 없음'),
    sourceDetail: String(product.inflowPathAdd || entry.inflowPathAdd || ''),
    productName: String(product.productName || entry.productName || '상품 정보 없음'),
    quantity: Number(product.quantity || entry.quantity || 1),
    revenue: Number(product.totalPaymentAmount || entry.totalPaymentAmount || 0),
  }
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({})) as InflowRequest
  const days = Math.min(30, Math.max(7, Number(input.days) || 14))
  const { client, error } = await getCurrentNaverClient()
  if (!client) return NextResponse.json({ message: error }, { status: 503 })

  try {
    const now = new Date()
    const jobs = Array.from({ length: days }, (_, index) => {
      const to = new Date(now.getTime() - index * 86_400_000)
      const from = new Date(to.getTime() - 86_400_000 + 1)
      return client.getOrders({ fromDate: from.toISOString(), toDate: to.toISOString(), pageSize: 300 })
    })
    const results = await Promise.all(jobs)
    const orders = results.flatMap((result) => (result.data?.contents || []) as unknown as RawOrder[])
    const sources = new Map<string, { source: string; detail: string; orders: number; quantity: number; revenue: number }>()
    const products = new Map<string, { name: string; orders: number; quantity: number; revenue: number }>()

    for (const raw of orders) {
      const order = extractOrder(raw)
      const sourceKey = `${order.source}::${order.sourceDetail}`
      const source = sources.get(sourceKey) || { source: order.source, detail: order.sourceDetail, orders: 0, quantity: 0, revenue: 0 }
      source.orders += 1
      source.quantity += order.quantity
      source.revenue += order.revenue
      sources.set(sourceKey, source)

      const product = products.get(order.productName) || { name: order.productName, orders: 0, quantity: 0, revenue: 0 }
      product.orders += 1
      product.quantity += order.quantity
      product.revenue += order.revenue
      products.set(order.productName, product)
    }

    return NextResponse.json({
      days,
      totalOrders: orders.length,
      sources: [...sources.values()].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue).slice(0, 10),
      products: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 10),
    })
  } catch (inflowError) {
    return NextResponse.json(
      { message: formatCommerceError(inflowError, '판매 유입 데이터를 가져오지 못했습니다.') },
      { status: 502 }
    )
  }
}
