import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  groupNaverOrders,
  mapNaverStatus,
  resolveNaverStatus,
} from '../src/lib/markets/naver/mappers.ts'
import type { NaverOrder } from '../src/lib/naver/client.ts'

function naverRow(overrides: Record<string, unknown> = {}): NaverOrder {
  return {
    productOrderId: 'PO-1',
    orderId: 'O-1',
    orderDate: '2026-08-14T09:00:00Z',
    productName: '텀블러',
    productOption: '색상: 블랙',
    quantity: 2,
    unitPrice: 29900,
    totalPaymentAmount: 59800,
    orderStatus: 'PAYED',
    ordererName: '김주문',
    ordererTel: '010-0000-0000',
    shippingAddress: {
      name: '김수취',
      tel1: '010-1111-1111',
      baseAddress: '서울시 강남구',
      detailAddress: '101동',
      zipCode: '06000',
    },
    ...overrides,
  } as unknown as NaverOrder
}

test('claim status wins over product order status', () => {
  assert.equal(resolveNaverStatus('DELIVERING', 'CANCEL_REQUEST'), 'CANCEL_REQUEST')
  assert.equal(resolveNaverStatus('DELIVERED', 'RETURN_DONE'), 'RETURNED')
  assert.equal(resolveNaverStatus('PAYED', undefined, undefined), 'PAYED')
})

test('claimType fallback resolves request vs done', () => {
  assert.equal(resolveNaverStatus('PAYED', 'SOMETHING_REQUEST', 'EXCHANGE'), 'EXCHANGE_REQUEST')
  assert.equal(resolveNaverStatus('PAYED', 'DONE_STATE', 'RETURN'), 'RETURNED')
})

test('status map covers claim lifecycle and defaults to New', () => {
  assert.equal(mapNaverStatus('PURCHASE_DECIDED'), 'Confirmed')
  assert.equal(mapNaverStatus('CANCEL_DONE'), 'Cancelled')
  assert.equal(mapNaverStatus('UNKNOWN_FUTURE_STATUS'), 'New')
})

test('rows sharing an orderId group into one header with two items', () => {
  const rows = [
    naverRow(),
    naverRow({ productOrderId: 'PO-2', productName: '컵받침', quantity: 1 }),
    naverRow({ productOrderId: 'PO-3', orderId: 'O-2' }),
  ]
  const orders = groupNaverOrders(rows)
  assert.equal(orders.length, 2)

  const first = orders.find((o) => o.marketOrderRef === 'O-1')
  assert.ok(first)
  assert.equal(first.items.length, 2)
  assert.deepEqual(
    first.items.map((i) => i.marketItemRef),
    ['PO-1', 'PO-2']
  )
  assert.equal(first.receiverName, '김수취')
})

test('content-wrapped payload (list API shape) is preferred over flat fields', () => {
  const row = naverRow({
    content: {
      order: { orderId: 'O-9', ordererName: '진짜주문자', orderDate: '2026-08-13T00:00:00Z' },
      productOrder: {
        productOrderStatus: 'DELIVERING',
        productName: '진짜상품',
        quantity: 5,
        shippingAddress: { name: '진짜수취', tel1: '010-9', zipCode: '1', baseAddress: 'A', detailedAddress: 'B' },
      },
    },
  })
  const [order] = groupNaverOrders([row])
  assert.equal(order.marketOrderRef, 'O-9')
  assert.equal(order.ordererName, '진짜주문자')
  assert.equal(order.receiverAddress, 'A B')
  assert.equal(order.items[0].productName, '진짜상품')
  assert.equal(order.items[0].quantity, 5)
  assert.equal(order.items[0].status, 'Delivering')
})

test('grouping does not mutate prior results (immutability)', () => {
  const rows = [naverRow(), naverRow({ productOrderId: 'PO-2' })]
  const orders = groupNaverOrders(rows)
  const again = groupNaverOrders([rows[0]])
  assert.equal(orders[0].items.length, 2)
  assert.equal(again[0].items.length, 1)
})
