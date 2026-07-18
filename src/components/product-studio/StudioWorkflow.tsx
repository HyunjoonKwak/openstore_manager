import { BarChart3, CheckCircle2, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, label: '시장 조사', description: '상품과 경쟁 페이지 수집', icon: BarChart3 },
  { id: 2, label: '인사이트', description: '강점과 개선점 정리', icon: CheckCircle2 },
  { id: 3, label: 'AI 제작', description: '브리프로 판매 문구 생성', icon: Sparkles },
  { id: 4, label: '검수 · 저장', description: '편집하고 결과 보관', icon: FileText },
] as const

interface StudioWorkflowProps {
  activeStep: 1 | 2 | 3 | 4
  className?: string
  compact?: boolean
}

export function StudioWorkflow({ activeStep, className, compact = false }: StudioWorkflowProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>
      {steps.map((step) => {
        const isActive = step.id === activeStep
        const isComplete = step.id < activeStep
        const Icon = step.icon

        return (
          <div
            key={step.id}
            className={cn(
              'relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
              isActive && 'border-primary bg-primary/10 text-foreground',
              isComplete && 'border-emerald-500/25 bg-emerald-500/5',
              !isActive && !isComplete && 'border-border bg-card text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isActive && 'bg-primary text-primary-foreground',
                isComplete && 'bg-emerald-500/15 text-emerald-600',
                !isActive && !isComplete && 'bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tabular-nums opacity-60">0{step.id}</span>
                <p className="text-sm font-semibold leading-none">{step.label}</p>
              </div>
              {!compact && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
