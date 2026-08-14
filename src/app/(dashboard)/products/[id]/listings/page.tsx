import { getMasterProductById } from '@/lib/actions/master-products'
import { getMarketAccounts } from '@/lib/actions/market-accounts'
import { ListingsEditorClient } from './ListingsEditorClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListingsEditorPage({ params }: PageProps) {
  const { id } = await params
  const [productResult, accountsResult] = await Promise.all([
    getMasterProductById(id),
    getMarketAccounts(),
  ])

  return (
    <ListingsEditorClient
      product={productResult.data}
      accounts={accountsResult.data || []}
      loadError={productResult.error}
    />
  )
}
