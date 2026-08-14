// Legacy route — supplier purchase orders moved to /orders/purchase.
import { redirect } from 'next/navigation'

export default function LegacySendPage() {
  redirect('/orders/purchase')
}
