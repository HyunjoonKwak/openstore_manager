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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ClaimAction } from '@/lib/markets/types'

// Reject flows require a reason; approve flows confirm with a summary.
// Every path states exactly what will happen on the market.

export const CLAIM_LABELS: Record<ClaimAction, string> = {
  confirm_order: '발주 확인',
  approve_cancel: '취소 승인',
  reject_cancel: '취소 거부',
  approve_return: '반품 승인',
  reject_return: '반품 거부',
  approve_exchange: '교환 승인',
  reject_exchange: '교환 거부',
}

const NEEDS_REASON: ClaimAction[] = ['reject_cancel', 'reject_return', 'reject_exchange']

export function ClaimActionDialog({
  open,
  onOpenChange,
  action,
  productName,
  isProcessing,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: ClaimAction | null
  productName: string
  isProcessing: boolean
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState('')
  const needsReason = action !== null && NEEDS_REASON.includes(action)

  if (!action) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CLAIM_LABELS[action]}</DialogTitle>
          <DialogDescription>
            &quot;{productName}&quot; 주문에 대해 {CLAIM_LABELS[action]} 처리를 마켓에 전송합니다.
          </DialogDescription>
        </DialogHeader>

        {needsReason && (
          <div className="space-y-1.5 py-1">
            <Label>거부 사유 *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="구매자에게 전달되는 사유입니다."
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            취소
          </Button>
          <Button
            onClick={() => onConfirm(needsReason ? reason : undefined)}
            disabled={isProcessing || (needsReason && !reason.trim())}
          >
            {isProcessing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {CLAIM_LABELS[action]} 실행
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
