'use client'

import { useState, useEffect } from 'react'
import { Package, MapPin, Clock, CheckCircle2, Truck, ExternalLink, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getTrackingUrl, type HanjinTrackingResult, type HanjinTrackingHistory } from '@/lib/logistics/hanjin'
import { cn } from '@/lib/utils'

interface TrackingStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackingNumber: string
  courierCode: string
  orderNumber: string
}

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  RECEIVED: { icon: Package, color: 'text-blue-500', label: '접수' },
  PICKED_UP: { icon: Package, color: 'text-blue-500', label: '집하' },
  IN_TRANSIT: { icon: Truck, color: 'text-yellow-500', label: '배송중' },
  OUT_FOR_DELIVERY: { icon: Truck, color: 'text-orange-500', label: '배송출발' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', label: '배송완료' },
  EXCEPTION: { icon: Package, color: 'text-red-500', label: '배송이상' },
  ERROR: { icon: Package, color: 'text-gray-500', label: '조회실패' },
  UNKNOWN: { icon: Package, color: 'text-gray-500', label: '알수없음' },
}

export function TrackingStatusDialog({
  open,
  onOpenChange,
  trackingNumber,
  courierCode,
  orderNumber,
}: TrackingStatusDialogProps) {
  const [trackingResult, setTrackingResult] = useState<HanjinTrackingResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTrackingStatus = async () => {
    if (!trackingNumber) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/logistics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, courierCode }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setTrackingResult(data)
      } else {
        setError(data.error || '배송 조회에 실패했습니다.')
      }
    } catch {
      setError('배송 조회 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && trackingNumber) {
      fetchTrackingStatus()
    }
  }, [open, trackingNumber])

  const handleOpenExternal = () => {
    const url = getTrackingUrl(courierCode, trackingNumber)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const currentStatus = trackingResult?.statusCode 
    ? statusConfig[trackingResult.statusCode] || statusConfig.UNKNOWN
    : statusConfig.UNKNOWN

  const StatusIcon = currentStatus.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            배송 조회
          </DialogTitle>
          <DialogDescription>
            주문 #{orderNumber} | 운송장 {trackingNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchTrackingStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </div>
          ) : trackingResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-full bg-background', currentStatus.color)}>
                    <StatusIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{trackingResult.status}</p>
                    {trackingResult.currentLocation && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trackingResult.currentLocation}
                      </p>
                    )}
                  </div>
                </div>
                {trackingResult.isTestMode && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                    테스트 모드
                  </Badge>
                )}
              </div>

              {trackingResult.estimatedDelivery && trackingResult.statusCode !== 'DELIVERED' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-4">
                  <Clock className="h-4 w-4" />
                  <span>예상 배송일: {trackingResult.estimatedDelivery}</span>
                </div>
              )}

              {trackingResult.deliveredAt && (
                <div className="flex items-center gap-2 text-sm text-green-600 px-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>배송완료: {new Date(trackingResult.deliveredAt).toLocaleString('ko-KR')}</span>
                </div>
              )}

              <Separator />

              <div className="px-4">
                <h4 className="font-semibold mb-3">배송 이력</h4>
                <div className="space-y-0">
                  {trackingResult.history.length > 0 ? (
                    trackingResult.history.slice().reverse().map((item: HanjinTrackingHistory, index: number) => (
                      <div key={index} className="relative pl-6 pb-4 last:pb-0">
                        <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary" />
                        {index !== trackingResult.history.length - 1 && (
                          <div className="absolute left-1.5 top-4 w-px h-full -translate-x-1/2 bg-border" />
                        )}
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{item.date}</span>
                            <span>{item.time}</span>
                          </div>
                          <p className="font-medium">{item.status}</p>
                          <p className="text-muted-foreground">{item.location}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">배송 이력이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={fetchTrackingStatus} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            택배사 사이트에서 조회
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
