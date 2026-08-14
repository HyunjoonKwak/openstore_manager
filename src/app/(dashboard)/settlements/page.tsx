import { getSettlements } from '@/lib/actions/market-settlements'
import { SettlementsClientV2 } from './SettlementsClientV2'

export const dynamic = 'force-dynamic'

export default async function SettlementsPage() {
  const { data } = await getSettlements()
  return <SettlementsClientV2 initialSettlements={data || []} />
}
