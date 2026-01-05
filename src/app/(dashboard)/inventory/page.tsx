import { getProducts, getProductStats, getUserStores } from '@/lib/actions/products'
import { getSuppliers } from '@/lib/actions/suppliers'
import { InventoryClient } from './InventoryClient'

export default async function InventoryPage() {
  const [productsResult, statsResult, suppliersResult, storesResult] = await Promise.all([
    getProducts(),
    getProductStats(),
    getSuppliers(),
    getUserStores(),
  ])

  const products = productsResult.data || []
  const stats = statsResult.data || {
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    healthy: 0,
  }
  const suppliers = suppliersResult.data || []
  const stores = storesResult.data || []

  return (
    <InventoryClient
      initialProducts={products}
      initialStats={stats}
      suppliers={suppliers}
      stores={stores}
    />
  )
}
