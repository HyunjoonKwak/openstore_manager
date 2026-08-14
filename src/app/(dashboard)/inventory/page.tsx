// Legacy route — the product screens moved to /products in the redesign.
import { redirect } from 'next/navigation'

export default function LegacyInventoryPage() {
  redirect('/products')
}
