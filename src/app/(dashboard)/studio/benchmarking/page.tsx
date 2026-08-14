// Benchmarking keeps its full legacy implementation; the studio route
// points at it until the screen moves here in the cleanup phase.
import { redirect } from 'next/navigation'

export default function StudioBenchmarkingPage() {
  redirect('/benchmarking')
}
