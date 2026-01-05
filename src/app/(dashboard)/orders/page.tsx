import { getOrders } from '@/lib/actions/orders'
import { OrdersClient } from './OrdersClient'
import { mockOrders } from '@/lib/mock-data'
import type { OrderTableItem } from '@/components/dashboard/OrdersTable'

function transformMockOrders(): OrderTableItem[] {
  return mockOrders.map((order) => ({
    id: order.id,
    platformOrderId: order.platformOrderId,
    product: {
      name: order.product.name,
      sku: order.product.sku,
    },
    customer: order.customer,
    date: order.date,
    total: order.total,
    quantity: order.quantity,
    status: order.status,
  }))
}

export default async function OrdersPage() {
  const { data: orders, error } = await getOrders()

  const ordersToDisplay: OrderTableItem[] = orders && orders.length > 0
    ? orders.map((order) => ({
        id: order.id,
        platformOrderId: order.platformOrderId,
        product: {
          name: order.product.name,
          sku: order.product.sku,
        },
        customer: order.customer,
        date: order.date,
        total: order.total,
        quantity: order.quantity,
        status: order.status,
      }))
    : transformMockOrders()

  return <OrdersClient initialOrders={ordersToDisplay} />
}
