'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ListingDiff } from '@/lib/actions/listings'

// Local vs actual market state, field by field. Values are never merged
// automatically — every overwrite is a user action elsewhere.

export function DiffTable({
  diff,
  isRefreshing,
  onRefresh,
}: {
  diff: ListingDiff | null
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-medium">
          {diff
            ? diff.differs
              ? '⚠ 실제 마켓과 다른 항목이 있습니다'
              : '로컬과 마켓 상태가 일치합니다'
            : '마켓 실제 상태와 대조'}
          {diff && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({new Date(diff.fetchedAt).toLocaleString('ko-KR')} 조회)
            </span>
          )}
        </p>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          다시 조회
        </Button>
      </div>

      {diff && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-1.5 text-left font-medium">필드</th>
              <th className="px-3 py-1.5 text-right font-medium">로컬 값</th>
              <th className="px-3 py-1.5 text-right font-medium">마켓 값</th>
            </tr>
          </thead>
          <tbody>
            {diff.fields.map((field) => {
              const differs =
                field.remoteValue !== null &&
                String(field.localValue) !== String(field.remoteValue)
              return (
                <tr key={field.field} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{field.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {field.localValue ?? '-'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-1.5 text-right tabular-nums',
                      differs && 'font-semibold text-warning'
                    )}
                  >
                    {field.remoteValue ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
