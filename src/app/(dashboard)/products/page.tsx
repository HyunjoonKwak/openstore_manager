import { getMasterProducts } from '@/lib/actions/master-products'
import { getMarketAccounts } from '@/lib/actions/market-accounts'
import { ProductsClient } from './ProductsClient'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const [productsResult, accountsResult] = await Promise.all([
    getMasterProducts(),
    getMarketAccounts(),
  ])

  return (
    <ProductsClient
      initialProducts={productsResult.data || []}
      accounts={accountsResult.data || []}
      loadError={productsResult.error}
    />
  )
}
