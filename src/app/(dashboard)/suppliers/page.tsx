import { getSuppliers, type SupplierWithStats } from '@/lib/actions/suppliers'
import { SuppliersClient } from './SuppliersClient'
import { mockSuppliers } from '@/lib/mock-data'

function transformMockSuppliers(): SupplierWithStats[] {
  return mockSuppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    contactNumber: supplier.contactNumber,
    contactMethod: supplier.contactMethod,
    productCount: supplier.productCount,
    lastOrderDate: supplier.lastOrderDate,
    createdAt: new Date().toISOString(),
  }))
}

export default async function SuppliersPage() {
  const { data: suppliers, error } = await getSuppliers()

  const suppliersToDisplay = suppliers && suppliers.length > 0
    ? suppliers
    : transformMockSuppliers()

  return <SuppliersClient initialSuppliers={suppliersToDisplay} />
}
