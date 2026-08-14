import { getOrderItems } from '@/lib/actions/market-orders'
import { OrdersClientV2 } from './OrdersClientV2'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const { data } = await getOrderItems()
  return <OrdersClientV2 initialItems={data || []} />
}
