import { getBenchmarkSessions } from '@/lib/actions/benchmark'
import { BenchmarkingClient } from './BenchmarkingClient'

export default async function BenchmarkingPage() {
  const { data: sessions } = await getBenchmarkSessions()

  return <BenchmarkingClient initialSessions={sessions || []} />
}
