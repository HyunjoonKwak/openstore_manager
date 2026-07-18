import { getBenchmarkSessions, getProductsForBenchmark } from '@/lib/actions/benchmark'
import { BenchmarkingClient } from './BenchmarkingClient'

export default async function BenchmarkingPage() {
  const [sessionsResult, productsResult] = await Promise.all([
    getBenchmarkSessions(),
    getProductsForBenchmark(),
  ])

  return (
    <BenchmarkingClient
      initialSessions={sessionsResult.data || []}
      products={productsResult.data || []}
    />
  )
}
