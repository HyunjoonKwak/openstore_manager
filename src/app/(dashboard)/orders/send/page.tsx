import { getOrdersForSupplierSend, getSuppliersForOrders } from '@/lib/actions/supplier-orders'
import SendToSupplierClient from './SendToSupplierClient'

export default async function SendToSupplierPage() {
  const [ordersResult, suppliersResult] = await Promise.all([
    getOrdersForSupplierSend('New'),
    getSuppliersForOrders(),
  ])

  const orders = ordersResult.data || []
  const suppliers = suppliersResult.data || []

  return <SendToSupplierClient orders={orders} suppliers={suppliers} />
}
