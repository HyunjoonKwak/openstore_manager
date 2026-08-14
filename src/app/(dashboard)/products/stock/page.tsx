import { getMasterProducts } from '@/lib/actions/master-products'
import { StockClient } from './StockClient'

export const dynamic = 'force-dynamic'

export default async function StockPage() {
  const result = await getMasterProducts()
  return <StockClient initialProducts={result.data || []} />
}
