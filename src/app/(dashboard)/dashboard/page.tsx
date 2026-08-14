import { getOrderItems } from '@/lib/actions/market-orders'
import { getMasterProducts } from '@/lib/actions/master-products'
import { DashboardClientV2 } from './DashboardClientV2'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [ordersResult, productsResult] = await Promise.all([
    getOrderItems({ limit: 200 }),
    getMasterProducts(),
  ])

  return (
    <DashboardClientV2
      orderItems={ordersResult.data || []}
      products={productsResult.data || []}
    />
  )
}
