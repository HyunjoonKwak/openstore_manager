import { getSuppliers } from '@/lib/actions/suppliers'
import { getCouriers } from '@/lib/actions/couriers'
import { SuppliersClient } from './SuppliersClient'

export default async function SuppliersPage() {
  const [suppliersResult, couriersResult] = await Promise.all([
    getSuppliers(),
    getCouriers(),
  ])

  return (
    <SuppliersClient 
      initialSuppliers={suppliersResult.data || []} 
      initialCouriers={couriersResult.data || []}
    />
  )
}
