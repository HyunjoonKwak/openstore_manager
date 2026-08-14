import { getSupplierOrderGroups } from '@/lib/actions/market-supplier-orders'
import { PurchaseClient } from './PurchaseClient'

export const dynamic = 'force-dynamic'

export default async function PurchasePage() {
  const { data } = await getSupplierOrderGroups()
  return <PurchaseClient initialGroups={data || []} />
}
