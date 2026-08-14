'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Loader2, Send, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { MarketFilterChips } from '@/components/layouts/MarketFilterChips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useMarketFilter, filterToAccountId } from '@/contexts/MarketFilterContext'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import {
  assignTrackingNumbers,
  planDispatch,
  applyDispatch,
  type DispatchPlanItem,
} from '@/lib/actions/market-dispatch'
import type { OrderItemView } from '@/lib/actions/market-orders'
import { DISPATCH_COURIERS, courierName } from '@/lib/markets/couriers'

// Dispatch — the second mobile-supported flow. Phones get numeric
// tracking input with recently-used couriers pinned; the market push
// runs through preview → confirm.

const RECENT_COURIERS_KEY = 'dispatch_recent_couriers'

function loadRecentCouriers(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_COURIERS_KEY) || '[]')
  } catch {
    return []
  }
}

function pushRecentCourier(code: string) {
  const current = loadRecentCouriers().filter((existing) => existing !== code)
  window.localStorage.setItem(RECENT_COURIERS_KEY, JSON.stringify([code, ...current].slice(0, 3)))
}

export function DispatchClientV2({ initialItems }: { initialItems: OrderItemView[] }) {
  const router = useRouter()
  const { filter } = useMarketFilter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Map<string, { courierCode: string; trackingNumber: string }>>(
    new Map()
  )
  const [isSavingTracking, setIsSavingTracking] = useState(false)
  const [plan, setPlan] = useState<DispatchPlanItem[] | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const recentCouriers = useMemo(loadRecentCouriers, [])
  const orderedCouriers = useMemo(() => {
    const recent = recentCouriers
      .map((code) => DISPATCH_COURIERS.find((courier) => courier.code === code))
      .filter((courier): courier is (typeof DISPATCH_COURIERS)[number] => Boolean(courier))
    const rest = DISPATCH_COURIERS.filter((courier) => !recentCouriers.includes(courier.code))
    return [...recent, ...rest]
  }, [recentCouriers])

  // Dispatch targets: paid/confirmed items that are not yet dispatched
  const targets = useMemo(() => {
    const accountId = filterToAccountId(filter)
    return initialItems.filter(
      (item) =>
        ['New', 'Ordered'].includes(item.status) &&
        (!accountId || item.marketAccountId === accountId)
    )
  }, [initialItems, filter])

  const getDraft = (item: OrderItemView) =>
    drafts.get(item.id) || {
      courierCode: item.courierCode || recentCouriers[0] || 'CJGLS',
      trackingNumber: item.trackingNumber || '',
    }

  const updateDraft = (id: string, patch: Partial<{ courierCode: string; trackingNumber: string }>) => {
    setDrafts((current) => {
      const next = new Map(current)
      const base = next.get(id) || {
        courierCode: recentCouriers[0] || 'CJGLS',
        trackingNumber: '',
      }
      next.set(id, { ...base, ...patch })
      return next
    })
  }

  const handleSaveTracking = async () => {
    const updates = [...drafts.entries()]
      .filter(([, draft]) => draft.trackingNumber.trim())
      .map(([orderItemId, draft]) => ({
        orderItemId,
        courierCode: draft.courierCode,
        trackingNumber: draft.trackingNumber.trim(),
      }))

    if (updates.length === 0) {
      toast.error('입력된 송장번호가 없습니다.')
      return
    }

    setIsSavingTracking(true)
    try {
      const result = await assignTrackingNumbers(updates)
      if (result.success) {
        for (const update of updates) pushRecentCourier(update.courierCode)
        toast.success(`${result.updatedCount}건의 송장이 저장되었습니다.`)
        setDrafts(new Map())
        router.refresh()
      } else {
        toast.error(result.error || '송장 저장에 실패했습니다.')
      }
    } finally {
      setIsSavingTracking(false)
    }
  }

  const handlePlan = async () => {
    if (selectedIds.size === 0) {
      toast.error('발송할 주문을 선택해주세요.')
      return
    }
    setIsPlanning(true)
    try {
      const result = await planDispatch([...selectedIds])
      if (result.data) setPlan(result.data)
      else toast.error(result.error || '미리보기에 실패했습니다.')
    } finally {
      setIsPlanning(false)
    }
  }

  const handleApply = async () => {
    if (!plan) return
    const readyIds = plan.filter((item) => item.ready).map((item) => item.orderItemId)
    setIsApplying(true)
    try {
      const result = await applyDispatch(readyIds)
      if (result.data) {
        const { succeeded, failed } = result.data
        if (failed.length === 0) {
          toast.success(`${succeeded.length}건이 발송 처리되었습니다.`)
        } else {
          toast.warning(`${succeeded.length}건 성공, ${failed.length}건 실패`, {
            description: failed
              .slice(0, 3)
              .map((f) => f.error)
              .join('\n'),
          })
        }
        setPlan(null)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(result.error || '발송 처리에 실패했습니다.')
      }
    } finally {
      setIsApplying(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const readyCount = plan?.filter((item) => item.ready).length || 0

  return (
    <>
      <Header title="발송 처리" subtitle="Dispatch" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <MarketFilterChips />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveTracking}
              disabled={isSavingTracking || drafts.size === 0}
            >
              {isSavingTracking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              송장 저장
            </Button>
            <Button onClick={handlePlan} disabled={isPlanning || selectedIds.size === 0}>
              {isPlanning ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {selectedIds.size}건 발송 미리보기
            </Button>
          </div>
        </div>

        {targets.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Truck className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">발송 대기 중인 주문이 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {targets.map((item) => {
              const draft = getDraft(item)
              return (
                <Card key={item.id} className={cn('py-0', selectedIds.has(item.id) && 'ring-1 ring-primary')}>
                  <CardContent className="flex flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center lg:gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PlatformBadge platform={item.platform} className="text-[10px]" />
                          {item.receiverName || '-'} · {item.quantity}개
                          {item.deliveryMemo && (
                            <span className="text-warning">메모: {item.deliveryMemo}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 lg:w-96">
                      <Select
                        value={draft.courierCode}
                        onValueChange={(code) => updateDraft(item.id, { courierCode: code })}
                      >
                        <SelectTrigger className="w-36 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderedCouriers.map((courier, index) => (
                            <SelectItem key={`${courier.code}-${index}`} value={courier.code}>
                              {courier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="송장번호"
                        value={draft.trackingNumber}
                        onChange={(e) => updateDraft(item.id, { trackingNumber: e.target.value })}
                        className="flex-1 tabular-nums"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 발송 미리보기 → 확인 */}
      <Dialog open={plan !== null} onOpenChange={(open) => !open && setPlan(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {readyCount}건을 마켓에 발송 처리합니다
            </DialogTitle>
            <DialogDescription>
              마켓에 송장이 등록되고 구매자에게 발송 알림이 나갑니다. 확인 후에만 실행됩니다.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 rounded-md border">
            <div className="divide-y divide-border">
              {(plan || []).map((item) => (
                <div
                  key={item.orderItemId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    !item.ready && 'opacity-60'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item.productName}</span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {item.receiverName || '-'}
                  </span>
                  {item.ready ? (
                    <Badge variant="outline" className="whitespace-nowrap tabular-nums">
                      {courierName(item.courierCode)} {item.trackingNumber}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                      {item.blockReason}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPlan(null)} disabled={isApplying}>
              취소
            </Button>
            <Button onClick={handleApply} disabled={isApplying || readyCount === 0}>
              {isApplying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}✓ {readyCount}건
              발송 실행
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
