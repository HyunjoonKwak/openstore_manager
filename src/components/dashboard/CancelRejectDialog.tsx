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

interface CancelRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  onConfirm: (reason: string) => void
  isLoading?: boolean
}

export function CancelRejectDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading = false,
}: CancelRejectDialogProps) {
  const [reason, setReason] = useState('')

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
          <DialogTitle>취소 거부</DialogTitle>
          <DialogDescription>
            주문 #{orderNumber}의 취소 요청을 거부합니다.
            거부 사유를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">거부 사유 (필수)</Label>
            <Textarea
              id="reason"
              placeholder="취소 거부 사유를 입력해주세요..."
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
