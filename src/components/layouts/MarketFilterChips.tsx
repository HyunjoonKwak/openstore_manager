'use client'

import { cn } from '@/lib/utils'
import { useMarketFilter } from '@/contexts/MarketFilterContext'
import { PLATFORM_DOT_COLORS, PLATFORM_LABELS } from '@/lib/markets/labels'

// Top-bar market filter: [전체] [스마트스토어] [쿠팡]. Replaces the old
// store switcher. Unconnected platforms stay visible but disabled so
// the expansion slot is always on screen.

export function MarketFilterChips({ className }: { className?: string }) {
  const { accounts, filter, setFilter, isLoading } = useMarketFilter()

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className="h-7 w-14 animate-pulse rounded-full bg-muted" />
        <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  const connectedPlatforms = new Set(accounts.map((account) => account.platform))
  const missingPlatforms = (['naver', 'coupang'] as const).filter(
    (platform) => !connectedPlatforms.has(platform)
  )

  return (
    <div className={cn('flex items-center gap-1.5 overflow-x-auto', className)}>
      <button
        type="button"
        onClick={() => setFilter('all')}
        className={cn(
          'h-7 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors',
          filter === 'all'
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-border text-muted-foreground hover:bg-accent'
        )}
      >
        전체
      </button>

      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => setFilter(account.id)}
          className={cn(
            'flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
            filter === account.id
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          )}
          title={PLATFORM_LABELS[account.platform]}
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', PLATFORM_DOT_COLORS[account.platform])}
          />
          {account.name}
        </button>
      ))}

      {missingPlatforms.map((platform) => (
        <span
          key={platform}
          className="flex h-7 shrink-0 cursor-default items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground/50"
          title="설정 > 마켓 계정에서 연결할 수 있습니다"
        >
          <span className={cn('h-1.5 w-1.5 rounded-full opacity-40', PLATFORM_DOT_COLORS[platform])} />
          {PLATFORM_LABELS[platform]} 미연결
        </span>
      ))}
    </div>
  )
}
