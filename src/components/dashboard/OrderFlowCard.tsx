'use client'

import Link from 'next/link'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface OrderFlowStep {
  label: string
  count: number
  href: string
  highlight?: boolean
}

interface OrderFlowCardProps {
  title: string
  icon: React.ReactNode
  steps: OrderFlowStep[]
  lastUpdated?: string
  onRefresh?: () => void
  className?: string
}

export function OrderFlowCard({
  title,
  icon,
  steps,
  lastUpdated,
  onRefresh,
  className,
}: OrderFlowCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">최근 {lastUpdated}</span>
          )}
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center">
              <Link
                href={step.href}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3 sm:px-5 py-3 rounded-lg transition-colors hover:bg-muted/50',
                  step.highlight && 'bg-primary/5'
                )}
              >
                <span className="text-sm text-muted-foreground whitespace-nowrap">{step.label}</span>
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-bold',
                    step.highlight && step.count > 0 ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {step.count}
                  <span className="text-sm sm:text-base font-normal text-muted-foreground ml-0.5">건</span>
                </span>
              </Link>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 mx-1 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickStatCardProps {
  title: string
  icon: React.ReactNode
  items: {
    label: string
    value: string | number
    href?: string
    highlight?: boolean
  }[]
  lastUpdated?: string
  onRefresh?: () => void
  className?: string
}

export function QuickStatCard({
  title,
  icon,
  items,
  lastUpdated,
  onRefresh,
  className,
}: QuickStatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">최근 {lastUpdated}</span>
          )}
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => {
            const content = (
              <div
                className={cn(
                  'flex flex-col gap-1.5 p-3 rounded-lg',
                  item.href && 'hover:bg-muted/50 transition-colors cursor-pointer',
                  item.highlight && 'bg-destructive/5'
                )}
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span
                  className={cn(
                    'text-2xl font-bold',
                    item.highlight ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {item.value}
                </span>
              </div>
            )

            if (item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              )
            }
            return <div key={item.label}>{content}</div>
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface SettlementCardProps {
  todaySettlement: number
  expectedSettlement: number
  lastUpdated?: string
  onRefresh?: () => void
  className?: string
}

export function SettlementCard({
  todaySettlement,
  expectedSettlement,
  lastUpdated,
  onRefresh,
  className,
}: SettlementCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value) + '원'
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <CardTitle className="text-base font-semibold">정산 관리</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">최근 {lastUpdated}</span>
          )}
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/settlements"
            className="flex flex-col gap-1.5 p-4 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground">오늘정산</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(todaySettlement)}</span>
          </Link>
          <Link
            href="/settlements"
            className="flex flex-col gap-1.5 p-4 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground">정산예정</span>
            <span className="text-2xl font-bold">{formatCurrency(expectedSettlement)}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
