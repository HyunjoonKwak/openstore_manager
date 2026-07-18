import { redirect } from 'next/navigation'

interface LegacyAIGeneratorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyAIGeneratorPage({ searchParams }: LegacyAIGeneratorPageProps) {
  const params = await searchParams
  const query = new URLSearchParams({ view: 'ai' })

  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId

  if (sessionId) query.set('sessionId', sessionId)
  if (productId) query.set('productId', productId)

  redirect(`/benchmarking?${query.toString()}`)
}
