import { getOrdersForDispatch, getCouriersForDispatch } from '@/lib/actions/dispatch'
import { DispatchClient } from './DispatchClient'

export default async function DispatchPage() {
  const [ordersResult, couriersResult] = await Promise.all([
    getOrdersForDispatch(),
    getCouriersForDispatch(),
  ])

  return (
    <DispatchClient
      initialOrders={ordersResult.data || []}
      couriers={couriersResult.data || []}
    />
  )
}
