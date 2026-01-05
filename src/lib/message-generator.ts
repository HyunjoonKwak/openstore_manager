import type { MockOrder, MockSupplier } from './mock-data'

export function generateSupplierMessage(
  orders: MockOrder[],
  supplier: MockSupplier
): string {
  const itemsList = orders
    .map((order, index) => {
      return `${index + 1}. [${order.product.sku}] ${order.product.name} x ${order.quantity}`
    })
    .join('\n')

  const totalItems = orders.reduce((sum, order) => sum + order.quantity, 0)
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0)
  const formattedAmount = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(totalAmount)

  return `안녕하세요, ${supplier.name}님

새 주문이 들어왔습니다. 처리 부탁드립니다:

${itemsList}

총 ${orders.length}건, ${totalItems}개
예상 금액: ${formattedAmount}

수신 확인 부탁드립니다. 감사합니다!`
}

export function generateEnglishMessage(
  orders: MockOrder[],
  supplier: MockSupplier
): string {
  const itemsList = orders
    .map((order, index) => {
      return `${index + 1}. [${order.product.sku}] ${order.product.name} x ${order.quantity}`
    })
    .join('\n')

  const totalItems = orders.reduce((sum, order) => sum + order.quantity, 0)
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0)
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalAmount / 1300)

  return `Hello ${supplier.name},

Please process the following new order:

${itemsList}

Total: ${orders.length} orders, ${totalItems} items
Estimated Cost: ${formattedAmount}

Please confirm receipt. Thanks!`
}
