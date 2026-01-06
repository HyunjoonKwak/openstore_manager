import { getBenchmarkSession, getProductsForBenchmark } from '@/lib/actions/benchmark'
import { notFound } from 'next/navigation'
import { ComparisonViewerClient } from './ComparisonViewerClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BenchmarkSessionPage({ params }: PageProps) {
  const { id } = await params
  const [sessionResult, productsResult] = await Promise.all([
    getBenchmarkSession(id),
    getProductsForBenchmark(),
  ])

  if (sessionResult.error || !sessionResult.data) {
    notFound()
  }

  return (
    <ComparisonViewerClient
      session={sessionResult.data}
      products={productsResult.data || []}
    />
  )
}
