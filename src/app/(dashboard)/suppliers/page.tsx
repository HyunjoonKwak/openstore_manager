import { getSuppliers } from '@/lib/actions/suppliers'
import { SuppliersClient } from './SuppliersClient'

export default async function SuppliersPage() {
  const { data: suppliers } = await getSuppliers()

  return <SuppliersClient initialSuppliers={suppliers || []} />
}
