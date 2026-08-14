import { Header } from '@/components/layouts/Header'
import { Hammer } from 'lucide-react'

// Placeholder for redesign routes that are scaffolded but not yet built.
// Every instance disappears by the end of the screen rebuild phase.
export function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Hammer className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold">재설계 진행 중인 화면입니다</p>
        <p className="text-sm text-muted-foreground">
          이 화면은 마켓 중립 구조로 새로 만들어지고 있습니다.
        </p>
      </div>
    </>
  )
}
