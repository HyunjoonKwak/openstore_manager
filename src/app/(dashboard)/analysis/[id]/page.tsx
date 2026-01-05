import { notFound } from 'next/navigation'
import { getAnalysisById } from '@/lib/actions/analysis'
import { AnalysisResultClient } from './AnalysisResultClient'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const resolvedParams = await params
  const { data: analysis, error } = await getAnalysisById(resolvedParams.id)

  if (error || !analysis) {
    notFound()
  }

  return <AnalysisResultClient analysis={analysis} />
}
