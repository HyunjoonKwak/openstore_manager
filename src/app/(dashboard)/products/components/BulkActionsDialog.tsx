'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BulkOperation } from '@/lib/validation-redesign'

// Step-1 of the bulk flow: describe the operation in plain language and
// hand off to the preview. The primary button names the action; nothing
// is written here.

export type BulkKind = 'price_adjust' | 'stock_set'

export function BulkActionsDialog({
  open,
  onOpenChange,
  kind,
  targetCount,
  targetIds,
  isPlanning,
  onPreview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: BulkKind
  targetCount: number
  targetIds: string[]
  isPlanning: boolean
  onPreview: (operation: BulkOperation, label: string) => void
}) {
  const [priceMode, setPriceMode] = useState<'percent' | 'absolute'>('percent')
  const [value, setValue] = useState('')

  const numeric = Number(value)
  const valid =
    value.trim() !== '' &&
    Number.isFinite(numeric) &&
    (kind === 'stock_set' ? numeric >= 0 && Number.isInteger(numeric) : Number.isInteger(numeric))

  const description =
    kind === 'price_adjust'
      ? priceMode === 'percent'
        ? `선택한 ${targetCount}개 상품의 기준가를 ${value || 'N'}% ${numeric >= 0 ? '인상' : '인하'}합니다.`
        : `선택한 ${targetCount}개 상품의 기준가를 ₩${Number(value || 0).toLocaleString()}(으)로 변경합니다.`
      : `선택한 ${targetCount}개 상품의 재고를 ${value || 'N'}개로 설정합니다.`

  const buttonLabel =
    kind === 'price_adjust'
      ? priceMode === 'percent'
        ? `기준가 ${value || 'N'}% ${numeric >= 0 ? '인상' : '인하'} 미리보기`
        : `기준가 변경 미리보기`
      : `재고 ${value || 'N'}개 설정 미리보기`

  const handlePreview = () => {
    if (!valid) return
    const operation: BulkOperation =
      kind === 'price_adjust'
        ? { type: 'price_adjust', mode: priceMode, value: numeric, targetIds }
        : { type: 'stock_set', value: numeric, targetIds }
    onPreview(operation, description)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === 'price_adjust' ? '가격 일괄 변경' : '재고 일괄 설정'}</DialogTitle>
          <DialogDescription>
            먼저 영향 상품과 변경 전·후 값을 미리보기로 보여드리며, 확인 후에만 실제 반영됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {kind === 'price_adjust' && (
            <div className="space-y-1.5">
              <Label>변경 방식</Label>
              <Select
                value={priceMode}
                onValueChange={(mode) => setPriceMode(mode as 'percent' | 'absolute')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">퍼센트 조정 (예: 5 = 5% 인상, -10 = 10% 인하)</SelectItem>
                  <SelectItem value="absolute">지정가로 변경</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              {kind === 'price_adjust' ? (priceMode === 'percent' ? '퍼센트' : '변경할 가격') : '재고 수량'}
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === 'price_adjust' ? (priceMode === 'percent' ? '5' : '29900') : '100'}
            />
          </div>

          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handlePreview} disabled={!valid || isPlanning}>
            {isPlanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
