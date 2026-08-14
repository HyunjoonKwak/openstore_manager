import type {
  NormalizedOrder,
  NormalizedOrderItem,
  OrderItemStatus,
} from '../types'
import type { NaverOrder } from '../../naver/client'

// Status normalization ported from actions/naver-sync.ts. Claim status
// wins over product order status — a cancel request must surface even
// while the line still reads DELIVERING on the Naver side.
// PAYED splits on placeOrderStatusType (ported from withus_manager):
// NOT_YET = 신규, OK = 발주확인 완료 → dispatch-ready.

export function resolveNaverStatus(
  productOrderStatus?: string,
  claimStatus?: string,
  claimType?: string,
  placeOrderStatus?: string
): string {
  if (claimStatus === 'CANCEL_REQUEST' || claimStatus === 'CANCEL_REQUESTED') return 'CANCEL_REQUEST'
  if (claimStatus === 'RETURN_REQUEST' || claimStatus === 'RETURN_REQUESTED') return 'RETURN_REQUEST'
  if (claimStatus === 'EXCHANGE_REQUEST' || claimStatus === 'EXCHANGE_REQUESTED') return 'EXCHANGE_REQUEST'
  if (claimStatus === 'CANCEL_DONE' || claimStatus === 'CANCELED') return 'CANCELED'
  if (claimStatus === 'RETURN_DONE' || claimStatus === 'RETURNED') return 'RETURNED'
  if (claimStatus === 'EXCHANGE_DONE' || claimStatus === 'EXCHANGED') return 'EXCHANGED'
  if (claimType === 'CANCEL' && claimStatus) {
    return claimStatus.includes('REQUEST') ? 'CANCEL_REQUEST' : 'CANCELED'
  }
  if (claimType === 'RETURN' && claimStatus) {
    return claimStatus.includes('REQUEST') ? 'RETURN_REQUEST' : 'RETURNED'
  }
  if (claimType === 'EXCHANGE' && claimStatus) {
    return claimStatus.includes('REQUEST') ? 'EXCHANGE_REQUEST' : 'EXCHANGED'
  }
  if (productOrderStatus === 'PAYED' && placeOrderStatus === 'OK') {
    return 'PAYED_CONFIRMED'
  }
  return productOrderStatus || 'PAYED'
}

const STATUS_MAP: Record<string, OrderItemStatus> = {
  PAYMENT_WAITING: 'New',
  PAYED: 'New',
  PAYED_CONFIRMED: 'Ordered',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
  PURCHASE_DECIDED: 'Confirmed',
  CANCELED: 'Cancelled',
  CANCELED_BY_NOPAYMENT: 'Cancelled',
  CANCEL_REQUEST: 'CancelRequested',
  CANCEL_REQUESTED: 'CancelRequested',
  CANCEL_DONE: 'Cancelled',
  RETURN_REQUEST: 'ReturnRequested',
  RETURN_REQUESTED: 'ReturnRequested',
  RETURNED: 'Returned',
  RETURN_DONE: 'Returned',
  EXCHANGE_REQUEST: 'ExchangeRequested',
  EXCHANGE_REQUESTED: 'ExchangeRequested',
  EXCHANGED: 'Exchanged',
  EXCHANGE_DONE: 'Exchanged',
}

export function mapNaverStatus(naverStatus: string): OrderItemStatus {
  return STATUS_MAP[naverStatus] || 'New'
}

interface NaverOrderContent {
  order?: Record<string, unknown>
  productOrder?: Record<string, unknown>
}

interface ShippingAddress {
  name?: string
  tel1?: string
  zipCode?: string
  baseAddress?: string
  // content-wrapped payloads use detailedAddress, flat rows use detailAddress
  detailedAddress?: string
  detailAddress?: string
}

/**
 * Map one Naver productOrder payload to a normalized order line plus
 * its header fields. Naver's list API returns productOrder-grained
 * rows; grouping into order headers happens in groupNaverOrders.
 */
export function mapNaverOrderRow(naverOrder: NaverOrder): {
  headerRef: string
  header: Omit<NormalizedOrder, 'items' | 'raw' | 'marketOrderRef'>
  item: NormalizedOrderItem
  raw: unknown
} {
  const content = (naverOrder as unknown as { content?: NaverOrderContent }).content
  const order = content?.order
  const productOrder = content?.productOrder
  const shipping = (productOrder?.shippingAddress ??
    (naverOrder as unknown as { shippingAddress?: unknown }).shippingAddress) as
    | ShippingAddress
    | undefined

  const address = shipping
    ? `${shipping.baseAddress || ''} ${shipping.detailedAddress || shipping.detailAddress || ''}`.trim() ||
      null
    : null

  const productOrderStatus = productOrder?.productOrderStatus as string | undefined
  const claimStatus = productOrder?.claimStatus as string | undefined
  const claimType = productOrder?.claimType as string | undefined
  const placeOrderStatus = productOrder?.placeOrderStatusType as string | undefined
  const effectiveStatus =
    resolveNaverStatus(productOrderStatus, claimStatus, claimType, placeOrderStatus) ||
    naverOrder.orderStatus ||
    'PAYED'

  const orderedAtRaw =
    (order?.orderDate as string | undefined) || naverOrder.orderDate || new Date().toISOString()

  const headerRef =
    (order?.orderId as string | undefined) || naverOrder.orderId || naverOrder.productOrderId

  return {
    headerRef,
    header: {
      orderedAt: new Date(orderedAtRaw),
      ordererName: (order?.ordererName as string | undefined) || null,
      ordererTel: (order?.ordererTel as string | undefined) || naverOrder.ordererTel || null,
      receiverName: shipping?.name || null,
      receiverTel: shipping?.tel1 || null,
      receiverAddress: address,
      zipCode: shipping?.zipCode || null,
      deliveryMemo:
        (productOrder?.shippingMemo as string | undefined) || naverOrder.shippingMemo || null,
      totalPaymentAmount:
        (productOrder?.totalPaymentAmount as number | undefined) ||
        naverOrder.totalPaymentAmount ||
        null,
    },
    item: {
      marketItemRef: naverOrder.productOrderId,
      productName:
        (productOrder?.productName as string | undefined) || naverOrder.productName || '(이름 없음)',
      optionName:
        (productOrder?.productOption as string | undefined) || naverOrder.productOption || null,
      remoteProductRef:
        (productOrder?.productId as string | undefined)?.toString() || null,
      quantity: (productOrder?.quantity as number | undefined) || naverOrder.quantity || 1,
      unitPrice: (productOrder?.unitPrice as number | undefined) || naverOrder.unitPrice || null,
      totalAmount:
        (productOrder?.totalPaymentAmount as number | undefined) ||
        naverOrder.totalPaymentAmount ||
        null,
      status: mapNaverStatus(effectiveStatus),
      marketStatusRaw: effectiveStatus,
      trackingNumber:
        (productOrder?.trackingNumber as string | undefined) || naverOrder.trackingNumber || null,
      courierCode:
        (productOrder?.deliveryCompanyCode as string | undefined) ||
        naverOrder.deliveryCompanyCode ||
        null,
    },
    raw: naverOrder,
  }
}

/** Group productOrder-grained rows into order headers with items. */
export function groupNaverOrders(rows: NaverOrder[]): NormalizedOrder[] {
  const byHeader = new Map<string, NormalizedOrder>()

  for (const row of rows) {
    const mapped = mapNaverOrderRow(row)
    const existing = byHeader.get(mapped.headerRef)
    if (existing) {
      byHeader.set(mapped.headerRef, {
        ...existing,
        items: [...existing.items, mapped.item],
        raw: [...(existing.raw as unknown[]), mapped.raw],
      })
    } else {
      byHeader.set(mapped.headerRef, {
        marketOrderRef: mapped.headerRef,
        ...mapped.header,
        items: [mapped.item],
        raw: [mapped.raw],
      })
    }
  }

  return [...byHeader.values()]
}
