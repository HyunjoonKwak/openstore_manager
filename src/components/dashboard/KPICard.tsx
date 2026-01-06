import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface KPICardProps {
  title: string
  value: string
  icon: React.ReactNode
  footer?: React.ReactNode
  iconBgColor?: string
  iconColor?: string
}

export function KPICard({
  title,
  value,
  icon,
  footer,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
}: KPICardProps) {
  return (
    <Card className="group relative overflow-hidden hover:border-primary/50 transition-colors">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-xs sm:text-sm font-medium truncate">{title}</p>
            <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2 tracking-tight truncate">{value}</h3>
          </div>
          <div className={cn('rounded-lg p-2 sm:p-3 shrink-0 ml-2', iconBgColor, iconColor)}>
            {icon}
          </div>
        </div>
        {footer && <div className="flex items-center gap-2 pt-2 border-t border-border/50">{footer}</div>}
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  )
}

interface TrendFooterProps {
  value: string
  label: string
  isPositive?: boolean
}

export function TrendFooter({ value, label, isPositive = true }: TrendFooterProps) {
  return (
    <>
      <span
        className={cn(
          'text-sm font-bold flex items-center',
          isPositive ? 'text-green-500' : 'text-destructive'
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  )
}

interface ProgressFooterProps {
  progress: number
  label: string
}

export function ProgressFooter({ progress, label }: ProgressFooterProps) {
  return (
    <>
      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-warning rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  )
}

interface LinkFooterProps {
  value: string
  label: string
  color?: string
}

export function LinkFooter({ value, label, color = 'text-primary' }: LinkFooterProps) {
  return (
    <>
      <span className={cn('text-sm font-bold flex items-center', color)}>
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  )
}
