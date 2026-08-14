'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { REMOTE_STATUS_LABELS } from '@/components/markets/PlatformBadge'
import type { ListingSummary } from '@/lib/actions/master-products'
import type { ValidationIssue } from '@/lib/markets/types'

// One market column cell on the product list: sale status + market
// price + anomaly signals (준비 안 됨 / 마켓과 다름). Max 2 signals per
// cell to keep rows scannable.

const STATUS_TEXT_COLORS: Record<string, string> = {
  SALE: 'text-green-600',
  OUTOFSTOCK: 'text-destructive',
  SUSPENSION: 'text-warning',
  PROHIBITION: 'text-destructive',
}

function formatWon(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`
}

export function MarketCell({
  listing,
  basePrice,
  issues,
  onIssuesClick,
}: {
  listing: ListingSummary | null
  basePrice: number
  issues: ValidationIssue[]
  onIssuesClick?: () => void
}) {
  const issueBadge =
    issues.length > 0 ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onIssuesClick}
            className="flex items-center gap-1 rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning"
          >
            <AlertTriangle className="h-3 w-3" />
            준비 안 됨 {issues.length}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-72">
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {issues.map((issue) => (
              <li key={`${issue.field}:${issue.code}`}>{issue.message}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    ) : null

  if (!listing) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[13px] text-muted-foreground/60">미배포</span>
        {issueBadge}
      </div>
    )
  }

  const statusLabel = listing.remoteStatus
    ? REMOTE_STATUS_LABELS[listing.remoteStatus] || listing.remoteStatus
    : listing.status === 'draft'
      ? '초안'
      : listing.status

  const marketPrice = listing.priceOverride ?? basePrice
  const priceDiffers = listing.priceOverride !== null && listing.priceOverride !== basePrice

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-[13px] font-medium',
            STATUS_TEXT_COLORS[listing.remoteStatus || ''] || 'text-foreground'
          )}
        >
          {statusLabel}
        </span>
        <span
          className={cn(
            'text-[12px] tabular-nums',
            priceDiffers ? 'font-medium text-primary' : 'text-muted-foreground'
          )}
        >
          {formatWon(marketPrice)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {listing.lastError && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">
                오류
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72 text-xs">
              {listing.lastError}
            </TooltipContent>
          </Tooltip>
        )}
        {issueBadge}
      </div>
    </div>
  )
}
