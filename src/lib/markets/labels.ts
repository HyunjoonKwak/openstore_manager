// Client-safe market display constants — no adapter imports here.

import type { MarketPlatform } from './types.ts'

export const PLATFORM_LABELS: Record<MarketPlatform, string> = {
  naver: '스마트스토어',
  coupang: '쿠팡',
}

/** Fixed per-platform accent colors (chips, table cells, badges). */
export const PLATFORM_DOT_COLORS: Record<MarketPlatform, string> = {
  naver: 'bg-green-500',
  coupang: 'bg-purple-500',
}

export const PLATFORM_BADGE_COLORS: Record<MarketPlatform, string> = {
  naver: 'bg-green-500/10 text-green-600 border-green-500/20',
  coupang: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
}
