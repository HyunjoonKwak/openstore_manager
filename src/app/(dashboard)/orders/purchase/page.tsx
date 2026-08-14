// Supplier purchase orders — the rebuilt /orders/send. Until the screen
// lands, keep the flow reachable through the legacy page.
import { redirect } from 'next/navigation'

export default function PurchasePage() {
  redirect('/orders/send')
}
