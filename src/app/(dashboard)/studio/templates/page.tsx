import { getStudioTemplates } from '@/lib/actions/interview'
import { TemplatesClient } from './TemplatesClient'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const { data } = await getStudioTemplates()
  return <TemplatesClient templates={data || []} />
}
