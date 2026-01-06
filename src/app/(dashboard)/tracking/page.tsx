'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Package, Truck, MapPin, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp, Sparkles, Plus } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { predictCarriers, getAllCarriers } from '@/lib/carriers/types'
import type { TrackInfo, TrackEvent, TrackEventStatusCode, CarrierInfo } from '@/lib/carriers/types'
import type { DeliveryTracking } from '@/types/database.types'

const CARRIERS = getAllCarriers()

const STATUS_CONFIG: Record<TrackEventStatusCode, { label: string; color: string; icon: typeof Package }> = {
  UNKNOWN: { label: '알 수 없음', color: 'bg-gray-100 text-gray-600', icon: Package },
  INFORMATION_RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-600', icon: Package },
  AT_PICKUP: { label: '집하', color: 'bg-indigo-100 text-indigo-600', icon: Package },
  IN_TRANSIT: { label: '이동중', color: 'bg-yellow-100 text-yellow-600', icon: Truck },
  OUT_FOR_DELIVERY: { label: '배송출발', color: 'bg-orange-100 text-orange-600', icon: Truck },
  ATTEMPT_FAIL: { label: '배송실패', color: 'bg-red-100 text-red-600', icon: AlertCircle },
  DELIVERED: { label: '배송완료', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  AVAILABLE_FOR_PICKUP: { label: '픽업가능', color: 'bg-purple-100 text-purple-600', icon: MapPin },
  EXCEPTION: { label: '이상', color: 'bg-red-100 text-red-600', icon: AlertCircle },
}

export default function TrackingPage() {
  const [carrierId, setCarrierId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedCarriers, setSuggestedCarriers] = useState<CarrierInfo[]>([])
  const [activeTab, setActiveTab] = useState<'in_progress' | 'delivered'>('in_progress')
  const [trackings, setTrackings] = useState<DeliveryTracking[]>([])
  const [expandedTrackingId, setExpandedTrackingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isNewTrackingOpen, setIsNewTrackingOpen] = useState(false)

  const fetchTrackings = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const status = activeTab === 'in_progress' ? 'IN_PROGRESS' : 'DELIVERED'
      const response = await fetch(`/api/delivery-tracking?status=${status}`)
      const data = await response.json()
      if (data.trackings) {
        setTrackings(data.trackings)
      }
    } catch {
      console.error('Failed to fetch trackings')
    } finally {
      setIsLoadingList(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchTrackings()
  }, [fetchTrackings])

  useEffect(() => {
    if (trackingNumber.trim().length >= 10) {
      const suggestions = predictCarriers(trackingNumber.trim())
      setSuggestedCarriers(suggestions)
      if (suggestions.length > 0 && !carrierId) {
        setCarrierId(suggestions[0].id)
      }
    } else {
      setSuggestedCarriers([])
    }
  }, [trackingNumber, carrierId])

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      setError('운송장 번호를 입력해주세요.')
      return
    }
    if (!carrierId) {
      setError('택배사를 선택해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrierId, trackingNumber: trackingNumber.trim() }),
      })
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.trackInfo) {
        fetchTrackings()
        setTrackingNumber('')
        setCarrierId('')
        setSuggestedCarriers([])
        setIsNewTrackingOpen(false)
        if (data.tracking) {
          setExpandedTrackingId(data.tracking.id)
        }
      }
    } catch {
      setError('배송 조회 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async (tracking: DeliveryTracking) => {
    setRefreshingId(tracking.id)
    try {
      const response = await fetch('/api/delivery-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId: tracking.carrier_id,
          trackingNumber: tracking.tracking_number,
        }),
      })
      const data = await response.json()
      if (!data.error) {
        fetchTrackings()
      }
    } catch {
      console.error('Failed to refresh tracking')
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 배송 추적을 삭제하시겠습니까?')) return
    
    setDeletingId(id)
    try {
      await fetch(`/api/delivery-tracking?id=${id}`, { method: 'DELETE' })
      fetchTrackings()
    } catch {
      console.error('Failed to delete tracking')
    } finally {
      setDeletingId(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const renderTrackingEvents = (events: TrackEvent[]) => {
    if (events.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-4">
          배송 이력이 없습니다.
        </p>
      )
    }

    return (
      <div className="relative">
        {[...events].reverse().map((event, index) => {
          const StatusIcon = STATUS_CONFIG[event.status.code]?.icon || Package
          const isLatest = index === 0
          const isDelivered = event.status.code === 'DELIVERED'

          return (
            <div key={index} className="flex gap-3 pb-4 last:pb-0">
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    isDelivered
                      ? 'bg-green-500 text-white'
                      : isLatest
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <StatusIcon className="h-4 w-4" />
                </div>
                {index !== events.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'font-medium text-sm',
                      isLatest ? 'text-primary' : ''
                    )}
                  >
                    {event.status.name || STATUS_CONFIG[event.status.code]?.label || '알 수 없음'}
                  </span>
                  {isLatest && (
                    <Badge variant="outline" className="text-xs">
                      최신
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(event.time)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTrackingItem = (tracking: DeliveryTracking) => {
    const isExpanded = expandedTrackingId === tracking.id
    const events = (tracking.events as unknown as TrackEvent[]) || []
    const statusCode = (tracking.latest_event_status as TrackEventStatusCode) || 'UNKNOWN'

    return (
      <div
        key={tracking.id}
        className="border rounded-lg overflow-hidden"
      >
        <div
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedTrackingId(isExpanded ? null : tracking.id)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Badge className={cn(STATUS_CONFIG[statusCode]?.color, 'text-xs')}>
                  {STATUS_CONFIG[statusCode]?.label || '알 수 없음'}
                </Badge>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {tracking.product_name || tracking.carrier_name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {tracking.tracking_number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {tracking.product_name ? `${tracking.carrier_name} · ` : ''}{tracking.latest_event_description || '상태 정보 없음'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRefresh(tracking)
                }}
                disabled={refreshingId === tracking.id}
              >
                <RefreshCw className={cn('h-4 w-4', refreshingId === tracking.id && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(tracking.id)
                }}
                disabled={deletingId === tracking.id}
              >
                {deletingId === tracking.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {(tracking.sender_name || tracking.recipient_name || tracking.recipient_address) && (
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-4 flex-wrap">
                {tracking.sender_name && <span>보내는 분: {tracking.sender_name}</span>}
                {tracking.recipient_name && <span>받는 분: {tracking.recipient_name}</span>}
              </div>
              {tracking.recipient_address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{tracking.recipient_address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t px-4 py-3 bg-muted/30">
            {renderTrackingEvents(events)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Header title="배송 조회" subtitle="Delivery Tracking" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <CardTitle>배송 목록</CardTitle>
                </div>
                <Button
                  variant={isNewTrackingOpen ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setIsNewTrackingOpen(!isNewTrackingOpen)}
                >
                  <Plus className={cn("h-4 w-4 transition-transform", isNewTrackingOpen && "rotate-45")} />
                  <span className="ml-1.5">{isNewTrackingOpen ? '닫기' : '새 조회'}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Collapsible open={isNewTrackingOpen} onOpenChange={setIsNewTrackingOpen}>
                <CollapsibleContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="space-y-2">
                      <Label>운송장 번호</Label>
                      <Input
                        placeholder="운송장 번호를 입력하세요"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="font-mono bg-background"
                      />
                      {suggestedCarriers.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            <span>추천:</span>
                          </div>
                          {suggestedCarriers.map((carrier) => (
                            <Button
                              key={carrier.id}
                              variant={carrierId === carrier.id ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setCarrierId(carrier.id)}
                            >
                              {carrier.displayName}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3 space-y-2">
                        <Label>택배사</Label>
                        <Select value={carrierId} onValueChange={setCarrierId}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="택배사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARRIERS.map((carrier) => (
                              <SelectItem key={carrier.id} value={carrier.id}>
                                {carrier.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="invisible hidden sm:block">조회</Label>
                        <Button 
                          onClick={handleSearch} 
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          <span className="ml-2">조회</span>
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'in_progress' | 'delivered')}>
                <TabsList className="w-full">
                  <TabsTrigger value="in_progress" className="flex-1">
                    <Truck className="h-4 w-4 mr-1.5" />
                    진행중
                  </TabsTrigger>
                  <TabsTrigger value="delivered" className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    배송완료
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="in_progress" className="mt-4">
                  {isLoadingList ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : trackings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">진행중인 배송이 없습니다</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsNewTrackingOpen(true)}
                      >
                        새 운송장 조회하기
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackings.map(renderTrackingItem)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="delivered" className="mt-4">
                  {isLoadingList ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : trackings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">완료된 배송이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackings.map(renderTrackingItem)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
