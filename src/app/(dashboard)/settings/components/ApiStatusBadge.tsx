'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type ApiConnectionState = 'idle' | 'success' | 'error'

export function ApiStatusBadge({ configured, state }: { configured: boolean; state: ApiConnectionState }) {
  if (state === 'success') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle className="mr-1 h-3.5 w-3.5" /> 연결 정상
      </Badge>
    )
  }
  if (state === 'error') {
    return (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3.5 w-3.5" /> 확인 필요
      </Badge>
    )
  }
  return configured ? (
    <Badge variant="secondary">
      <CheckCircle className="mr-1 h-3.5 w-3.5" /> 설정됨
    </Badge>
  ) : (
    <Badge variant="outline">
      <AlertCircle className="mr-1 h-3.5 w-3.5" /> 미설정
    </Badge>
  )
}
