'use client'

import { useState, useTransition } from 'react'
import { Package, Truck, ExternalLink, FlaskConical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTrackingNumber } from '@/lib/actions/orders'
import { COURIER_CODES, validateHanjinTrackingNumber, getTrackingUrl } from '@/lib/logistics/hanjin'
import { toast } from 'sonner'

interface TrackingNumberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNumber: string
  currentTrackingNumber?: string
  currentCourierCode?: string
  onSuccess?: () => void
}

const courierOptions = Object.values(COURIER_CODES).map(courier => ({
  code: courier.code,
  name: courier.name,
}))

export function TrackingNumberDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  currentTrackingNumber = '',
  currentCourierCode = 'HANJIN',
  onSuccess,
}: TrackingNumberDialogProps) {
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber)
  const [courierCode, setCourierCode] = useState(currentCourierCode)
  const [isPending, startTransition] = useTransition()

  const generateTestTrackingNumber = () => {
    const prefix = 'TEST'
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  const handleGenerateTest = () => {
    const testNumber = generateTestTrackingNumber()
    setTrackingNumber(testNumber)
    toast.success('테스트 운송장 번호가 생성되었습니다.')
  }

  const handleSave = () => {
    if (!trackingNumber.trim()) {
      toast.error('운송장 번호를 입력해주세요.')
      return
    }

    const isTestTrackingNumber = trackingNumber.startsWith('TEST')
    if (courierCode === 'HANJIN' && !isTestTrackingNumber && !validateHanjinTrackingNumber(trackingNumber)) {
      toast.error('유효하지 않은 운송장 번호입니다. (10~14자리 숫자)')
      return
    }

    startTransition(async () => {
      const result = await updateTrackingNumber(orderId, trackingNumber.trim(), courierCode)
      if (result.success) {
        toast.success('운송장 번호가 등록되었습니다.')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || '운송장 등록에 실패했습니다.')
      }
    })
  }

  const handleOpenTracking = () => {
    if (trackingNumber) {
      const url = getTrackingUrl(courierCode, trackingNumber)
      if (url) {
        window.open(url, '_blank')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            운송장 번호 입력
          </DialogTitle>
          <DialogDescription>
            주문 #{orderNumber}의 운송장 번호를 입력해주세요.
            <br />
            운송장 등록 시 주문 상태가 &quot;발송처리&quot;로 변경되고, 네이버에 운송장이 전송됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="courier">택배사</Label>
            <Select value={courierCode} onValueChange={setCourierCode}>
              <SelectTrigger id="courier">
                <SelectValue placeholder="택배사 선택" />
              </SelectTrigger>
              <SelectContent>
                {courierOptions.map((courier) => (
                  <SelectItem key={courier.code} value={courier.code}>
                    {courier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trackingNumber">운송장 번호</Label>
            <div className="flex gap-2">
              <Input
                id="trackingNumber"
                placeholder="운송장 번호 입력"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="font-mono"
              />
              {trackingNumber && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleOpenTracking}
                  title="배송 조회"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {courierCode === 'HANJIN' 
                ? '한진택배 운송장은 10~14자리 숫자입니다.'
                : '운송장 번호를 정확히 입력해주세요.'}
            </p>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <FlaskConical className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">테스트 모드</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                  실제 택배 API 연동 전, 테스트 운송장 번호를 생성하여 기능을 테스트할 수 있습니다.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTest}
                  className="bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 border-yellow-300 dark:border-yellow-700"
                >
                  <FlaskConical className="h-3 w-3 mr-1" />
                  테스트 운송장 생성
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            <Truck className="h-4 w-4 mr-2" />
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
