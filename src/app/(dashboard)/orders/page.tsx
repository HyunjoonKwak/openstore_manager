import { getOrders } from '@/lib/actions/orders'
import { OrdersClient } from './OrdersClient'
import type { OrderTableItem } from '@/components/dashboard/OrdersTable'

export default async function OrdersPage() {
  const { data: orders } = await getOrders()

  const ordersToDisplay: OrderTableItem[] = (orders || []).map((order) => ({
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

  return <OrdersClient initialOrders={ordersToDisplay} />
}
