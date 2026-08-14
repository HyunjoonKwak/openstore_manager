'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { BulkPlan, BulkApplyResult } from '@/lib/actions/bulk'

// Step-2 of every bulk mutation: full-screen(ish) preview listing each
// affected item with before → after, individual exclusion, and a count
// restated on the confirm button. smartku 벤치마크 ② — the target list
// is items, never just a count.

interface BulkPreviewScreenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Plain-language description of the operation, e.g. "판매가 5% 인상" */
  actionLabel: string
  plan: BulkPlan | null
  formatValue: (value: number) => string
  isApplying: boolean
  applyResult: BulkApplyResult | null
  onConfirm: (included: Array<{ id: string; before: number }>) => void
}

export function BulkPreviewScreen({
  open,
  onOpenChange,
  actionLabel,
  plan,
  formatValue,
  isApplying,
  applyResult,
  onConfirm,
}: BulkPreviewScreenProps) {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const includedItems = useMemo(
    () => (plan?.items || []).filter((item) => !excludedIds.has(item.id)),
    [plan, excludedIds]
  )

  const toggleExclude = (id: string) => {
    setExcludedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(includedItems.map((item) => ({ id: item.id, before: item.before })))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {plan ? `${includedItems.length}건이 대상입니다` : '미리보기 준비 중'}
          </DialogTitle>
          <DialogDescription>
            {actionLabel} — 아래 목록을 확인하고 제외할 항목의 체크를 해제하세요. 확인 후에만 실제
            반영됩니다.
          </DialogDescription>
        </DialogHeader>

        {applyResult ? (
          <div className="space-y-3 py-2">
            <p className="font-medium">{applyResult.appliedCount}건이 변경되었습니다.</p>
            {applyResult.drifted.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <p className="mb-1 font-medium text-warning">
                  {applyResult.drifted.length}건은 미리보기 이후 값이 바뀌어 건너뛰었습니다
                </p>
                {applyResult.drifted.map((item) => (
                  <p key={item.id} className="text-muted-foreground">
                    · {item.label} — 예상 {formatValue(item.expectedBefore)} → 현재{' '}
                    {formatValue(item.currentValue)}
                  </p>
                ))}
              </div>
            )}
            {applyResult.failed.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <p className="mb-1 font-medium text-destructive">
                  {applyResult.failed.length}건 실패
                </p>
                {applyResult.failed.map((item) => (
                  <p key={item.id} className="text-muted-foreground">
                    · {item.error}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>닫기</Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1 rounded-md border">
              <div className="divide-y divide-border">
                {(plan?.items || []).map((item) => {
                  const excluded = excludedIds.has(item.id)
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50',
                        excluded && 'opacity-50'
                      )}
                    >
                      <Checkbox
                        checked={!excluded}
                        onCheckedChange={() => toggleExclude(item.id)}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatValue(item.before)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="whitespace-nowrap font-medium tabular-nums">
                        {formatValue(item.after)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </ScrollArea>

            {plan && plan.skippedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                선택했지만 접근할 수 없는 {plan.skippedCount}건은 대상에서 빠졌습니다.
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
                취소
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isApplying || includedItems.length === 0}
              >
                {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}✓{' '}
                {includedItems.length}건 실제 변경
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
