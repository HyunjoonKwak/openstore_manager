import { getOrders } from '@/lib/actions/orders'
import { OrdersClient } from './OrdersClient'
import type { OrderTableItem } from '@/components/dashboard/OrdersTable'

export default async function OrdersPage() {
  const { data: orders } = await getOrders()

  const ordersToDisplay: OrderTableItem[] = (orders || []).map((order) => ({
    id: order.id,
    platformOrderId: order.platformOrderId,
    naverOrderId: order.naverOrderId,
    product: {
      name: order.product.name,
      sku: order.product.sku,
      option: order.product.option,
    },
    customer: order.customer,
    receiver: order.receiver,
    date: order.date,
    total: order.total,
    unitPrice: order.unitPrice,
    quantity: order.quantity,
    status: order.status,
    naverStatus: order.naverStatus,
    trackingNumber: order.trackingNumber ?? undefined,
    courierCode: order.courierCode ?? undefined,
  }))

  return <OrdersClient initialOrders={ordersToDisplay} />
}
