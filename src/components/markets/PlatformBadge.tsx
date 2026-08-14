import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PLATFORM_BADGE_COLORS, PLATFORM_LABELS } from '@/lib/markets/labels'
import type { MarketPlatform } from '@/lib/markets/types'

export function PlatformBadge({
  platform,
  label,
  className,
}: {
  platform: MarketPlatform
  /** Override text (defaults to platform label) */
  label?: string
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(PLATFORM_BADGE_COLORS[platform], className)}>
      {label || PLATFORM_LABELS[platform]}
    </Badge>
  )
}

/** Remote sale-status labels shared across markets (Naver statusType 기준). */
export const REMOTE_STATUS_LABELS: Record<string, string> = {
  SALE: '판매중',
  OUTOFSTOCK: '품절',
  SUSPENSION: '판매중지',
  PROHIBITION: '판매금지',
  WAIT: '승인대기',
  UNADMISSION: '미승인',
  REJECTION: '거부',
  DELETE: '삭제',
  CLOSE: '전시중지',
}
