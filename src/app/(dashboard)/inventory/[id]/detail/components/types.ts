import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'

// Shared prop type: generic field updater owned by the parent page.
export type UpdateField = <K extends keyof NaverProductFullDetail>(
  field: K,
  value: NaverProductFullDetail[K]
) => void
