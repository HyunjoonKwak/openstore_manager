// Market research — the studio home. Redirect to the legacy AI generator
// screen until the studio shell is rebuilt.
import { redirect } from 'next/navigation'

export default function StudioResearchPage() {
  redirect('/ai-generator')
}
