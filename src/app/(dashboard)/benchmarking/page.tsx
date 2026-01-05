import { getAnalysisLogs } from '@/lib/actions/analysis'
import { BenchmarkingClient } from './BenchmarkingClient'

export default async function BenchmarkingPage() {
  const { data: logs } = await getAnalysisLogs()

  return <BenchmarkingClient initialLogs={logs || []} />
}
