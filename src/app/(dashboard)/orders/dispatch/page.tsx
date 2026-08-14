import { getOrderItems } from '@/lib/actions/market-orders'
import { DispatchClientV2 } from './DispatchClientV2'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
  const { data } = await getOrderItems()
  return <DispatchClientV2 initialItems={data || []} />
}
