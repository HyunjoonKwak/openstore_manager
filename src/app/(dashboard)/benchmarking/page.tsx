import { getBenchmarkSessions, getProductsForBenchmark } from '@/lib/actions/benchmark'
import { BenchmarkingClient } from './BenchmarkingClient'

interface BenchmarkingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BenchmarkingPage({ searchParams }: BenchmarkingPageProps) {
  const params = await searchParams
  const [sessionsResult, productsResult] = await Promise.all([
    getBenchmarkSessions(),
    getProductsForBenchmark(),
  ])

  const view = Array.isArray(params.view) ? params.view[0] : params.view
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId

  return (
    <BenchmarkingClient
      initialSessions={sessionsResult.data || []}
      products={productsResult.data || []}
      initialView={view === 'ai' ? 'ai' : 'research'}
      initialSessionId={sessionId || ''}
      initialProductId={productId || ''}
    />
  )
}
