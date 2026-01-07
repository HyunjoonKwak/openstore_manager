'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export type ClaimType = 'cancel' | 'return' | 'exchange'

const claimTypeLabels: Record<ClaimType, { title: string; description: string; placeholder: string }> = {
  cancel: {
    title: '취소 거부',
    description: '취소 요청을 거부합니다.',
    placeholder: '취소 거부 사유를 입력해주세요...',
  },
  return: {
    title: '반품 거부',
    description: '반품 요청을 거부합니다.',
    placeholder: '반품 거부 사유를 입력해주세요...',
  },
  exchange: {
    title: '교환 거부',
    description: '교환 요청을 거부합니다.',
    placeholder: '교환 거부 사유를 입력해주세요...',
  },
}

interface CancelRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  onConfirm: (reason: string) => void
  isLoading?: boolean
  claimType?: ClaimType
}

export function CancelRejectDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading = false,
  claimType = 'cancel',
}: CancelRejectDialogProps) {
  const [reason, setReason] = useState('')
  const labels = claimTypeLabels[claimType]

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason('')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>
            주문 #{orderNumber}의 {labels.description}
            거부 사유를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">거부 사유 (필수)</Label>
            <Textarea
              id="reason"
              placeholder={labels.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!reason.trim() || isLoading}>
            {isLoading ? '처리 중...' : '거부 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
