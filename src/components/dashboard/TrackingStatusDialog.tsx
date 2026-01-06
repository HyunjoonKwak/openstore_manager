'use client'

import { useState, useEffect } from 'react'
import { Package, MapPin, Clock, CheckCircle2, Truck, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { TrackInfo, TrackEventStatusCode } from '@/lib/carriers/types'

interface TrackingStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackingNumber: string
  courierCode: string
  orderNumber: string
}

const statusConfig: Record<TrackEventStatusCode, { icon: typeof Package; color: string; label: string }> = {
  INFORMATION_RECEIVED: { icon: Package, color: 'text-blue-500', label: '접수' },
  AT_PICKUP: { icon: Package, color: 'text-blue-500', label: '집하' },
  IN_TRANSIT: { icon: Truck, color: 'text-yellow-500', label: '배송중' },
  OUT_FOR_DELIVERY: { icon: Truck, color: 'text-orange-500', label: '배송출발' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', label: '배송완료' },
  ATTEMPT_FAIL: { icon: AlertCircle, color: 'text-red-500', label: '배송실패' },
  AVAILABLE_FOR_PICKUP: { icon: MapPin, color: 'text-purple-500', label: '픽업가능' },
  EXCEPTION: { icon: AlertCircle, color: 'text-red-500', label: '배송이상' },
  UNKNOWN: { icon: Package, color: 'text-gray-500', label: '알수없음' },
}

const TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  HANJIN: (t) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnum=${t}`,
  CJ: (t) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${t}`,
  LOGEN: (t) => `https://www.ilogen.com/web/personal/trace/${t}`,
  EPOST: (t) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${t}`,
  LOTTE: (t) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${t}`,
}

export function TrackingStatusDialog({
  open,
  onOpenChange,
  trackingNumber,
  courierCode,
  orderNumber,
}: TrackingStatusDialogProps) {
  const [trackingResult, setTrackingResult] = useState<TrackInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTrackingStatus = async () => {
    if (!trackingNumber) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/logistics/track?courierCode=${courierCode}&trackingNumber=${encodeURIComponent(trackingNumber)}`
      )
      
      const data: TrackInfo = await response.json()
      
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
    const urlFn = TRACKING_URLS[courierCode.toUpperCase()]
    if (urlFn) {
      window.open(urlFn(trackingNumber), '_blank')
    }
  }

  const getLatestStatus = (): TrackEventStatusCode => {
    if (!trackingResult?.events || trackingResult.events.length === 0) {
      return 'UNKNOWN'
    }
    return trackingResult.events[trackingResult.events.length - 1]?.status.code || 'UNKNOWN'
  }

  const getLatestLocation = (): string | null => {
    if (!trackingResult?.events || trackingResult.events.length === 0) {
      return null
    }
    return trackingResult.events[trackingResult.events.length - 1]?.location || null
  }

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return { date: '-', time: '' }
    try {
      const date = new Date(isoString)
      return {
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }
    } catch {
      return { date: isoString, time: '' }
    }
  }

  const latestStatus = getLatestStatus()
  const currentStatus = statusConfig[latestStatus] || statusConfig.UNKNOWN
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
                    <p className="font-semibold text-lg">{currentStatus.label}</p>
                    {getLatestLocation() && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getLatestLocation()}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {trackingResult.carrier.name}
                </Badge>
              </div>

              {trackingResult.sender?.name || trackingResult.recipient?.name ? (
                <div className="grid grid-cols-2 gap-4 px-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">보내는 분</span>
                    <p className="font-medium">{trackingResult.sender?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">받는 분</span>
                    <p className="font-medium">{trackingResult.recipient?.name || '-'}</p>
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="px-4">
                <h4 className="font-semibold mb-3">배송 이력</h4>
                <div className="space-y-0">
                  {trackingResult.events.length > 0 ? (
                    [...trackingResult.events].reverse().map((event, index) => {
                      const { date, time } = formatDateTime(event.time)
                      const isLatest = index === 0
                      const EventIcon = statusConfig[event.status.code]?.icon || Package

                      return (
                        <div key={index} className="relative pl-8 pb-4 last:pb-0">
                          <div className={cn(
                            'absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center',
                            isLatest ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}>
                            <EventIcon className="h-3 w-3" />
                          </div>
                          {index !== trackingResult.events.length - 1 && (
                            <div className="absolute left-2.5 top-6 w-px h-full -translate-x-1/2 bg-border" />
                          )}
                          <div className="text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>{date}</span>
                              {time && <span>{time}</span>}
                            </div>
                            <p className={cn('font-medium', isLatest && 'text-primary')}>
                              {event.status.name || statusConfig[event.status.code]?.label || '알 수 없음'}
                            </p>
                            {event.location && (
                              <p className="text-muted-foreground">{event.location}</p>
                            )}
                            {event.description && event.description !== event.status.name && (
                              <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                      )
                    })
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
