'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter, Download, Send, ChevronDown, Search, RefreshCw, Clock, AlertCircle, Truck, CheckCircle, Loader2 } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { OrdersTable, type OrderTableItem } from '@/components/dashboard/OrdersTable'
import { updateOrderStatus, cancelOrder, checkDeliveryStatusBatch, exportOrdersToExcel } from '@/lib/actions/orders'
import { syncNaverOrders, confirmNaverOrders, approveCancelRequest, rejectCancelRequest, approveReturnRequest, rejectReturnRequest, approveExchangeRequest, rejectExchangeRequest } from '@/lib/actions/naver-sync'
import { getStoreSyncStatus, type SyncStatus } from '@/lib/actions/store-management'
import { useStore } from '@/contexts/StoreContext'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TrackingNumberDialog } from '@/components/dashboard/TrackingNumberDialog'
import { TrackingStatusDialog } from '@/components/dashboard/TrackingStatusDialog'
import { CancelRejectDialog, type ClaimType } from '@/components/dashboard/CancelRejectDialog'

interface OrdersClientProps {
  initialOrders: OrderTableItem[]
}

export function OrdersClient({ initialOrders }: OrdersClientProps) {
  const router = useRouter()
  const { currentStore } = useStore()
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelTargetOrder, setCancelTargetOrder] = useState<OrderTableItem | null>(null)
  const [trackingInputDialogOpen, setTrackingInputDialogOpen] = useState(false)
  const [trackingViewDialogOpen, setTrackingViewDialogOpen] = useState(false)
  const [trackingTargetOrder, setTrackingTargetOrder] = useState<OrderTableItem | null>(null)
  const [cancelApproveTarget, setCancelApproveTarget] = useState<OrderTableItem | null>(null)
  const [cancelRejectDialogOpen, setCancelRejectDialogOpen] = useState(false)
  const [cancelRejectTarget, setCancelRejectTarget] = useState<OrderTableItem | null>(null)
  const [isCancelProcessing, setIsCancelProcessing] = useState(false)
  const [claimRejectType, setClaimRejectType] = useState<ClaimType>('cancel')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [periodFilter, setPeriodFilter] = useState<'7d' | '1m' | '3m' | '6m' | '1y'>('1m')

  const pendingCount = orders.filter((o) => o.status === 'New').length
  const selectedNewOrders = selectedOrderIds.filter((id) => {
    const order = orders.find((o) => o.id === id)
    return order?.status === 'New'
  })

  const loadSyncStatus = useCallback(async () => {
    if (!currentStore?.id) return
    const result = await getStoreSyncStatus(currentStore.id)
    if (result.data) {
      setSyncStatus(result.data)
    }
  }, [currentStore?.id])

  useEffect(() => {
    if (currentStore?.id) {
      loadSyncStatus()
    }
  }, [currentStore?.id, loadSyncStatus])

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    return `${diffDays}일 전`
  }

  const periodOptions: { value: '7d' | '1m' | '3m' | '6m' | '1y'; label: string; days: number }[] = [
    { value: '7d', label: '1주일', days: 7 },
    { value: '1m', label: '1개월', days: 30 },
    { value: '3m', label: '3개월', days: 90 },
    { value: '6m', label: '6개월', days: 180 },
    { value: '1y', label: '1년', days: 365 },
  ]

  const getPeriodStartDate = () => {
    const days = periodOptions.find(p => p.value === periodFilter)?.days || 30
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    
    const orderDate = new Date(order.date)
    if (orderDate < getPeriodStartDate()) return false
    
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.platformOrderId.toLowerCase().includes(query) ||
      order.product.name.toLowerCase().includes(query) ||
      order.product.sku.toLowerCase().includes(query) ||
      order.customer.name.toLowerCase().includes(query)
    )
  })

  const statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'New', label: '신규' },
    { value: 'Ordered', label: '발주확인' },
    { value: 'Dispatched', label: '발송처리' },
    { value: 'Delivering', label: '배송중' },
    { value: 'Delivered', label: '배송완료' },
    { value: 'Confirmed', label: '구매확정' },
    { value: 'CancelRequested', label: '취소요청' },
    { value: 'Cancelled', label: '취소완료' },
    { value: 'ReturnRequested', label: '반품요청' },
    { value: 'Returned', label: '반품완료' },
    { value: 'ExchangeRequested', label: '교환요청' },
    { value: 'Exchanged', label: '교환완료' },
  ]

  const currentStatusLabel = statusOptions.find(s => s.value === statusFilter)?.label || '전체'
  const currentPeriodLabel = periodOptions.find(p => p.value === periodFilter)?.label || '1개월'

  const handleNaverSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncNaverOrders({})
      if (result.success) {
        toast.success(`${result.syncedCount}건의 주문이 동기화되었습니다.`)
        router.refresh()
        await loadSyncStatus()
      } else {
        toast.error(result.error || '동기화에 실패했습니다.')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCheckDeliveryStatus = async () => {
    setIsCheckingDelivery(true)
    try {
      const result = await checkDeliveryStatusBatch()
      if (result.success) {
        if (result.checked === 0) {
          toast.info('확인할 배송중인 주문이 없습니다.')
        } else if (result.updated > 0) {
          toast.success(`${result.checked}건 확인, ${result.updated}건 상태 업데이트됨`)
          router.refresh()
        } else {
          toast.info(`${result.checked}건 확인, 변경사항 없음`)
        }
      } else {
        toast.error(result.error || '배송 상태 확인에 실패했습니다.')
      }
    } finally {
      setIsCheckingDelivery(false)
    }
  }

  const handleBulkConfirm = async () => {
    if (selectedNewOrders.length === 0) {
      toast.error('발주확인할 신규 주문을 선택해주세요.')
      return
    }

    setIsConfirming(true)
    try {
      const result = await confirmNaverOrders(selectedNewOrders)
      if (result.success) {
        toast.success(`${result.confirmedCount}건 발주확인 완료`)
        setOrders((prev) =>
          prev.map((o) =>
            selectedNewOrders.includes(o.id) ? { ...o, status: 'Ordered' as OrderStatus } : o
          )
        )
        setSelectedOrderIds([])
        router.refresh()
      } else {
        toast.error(result.error || '발주확인에 실패했습니다.')
      }
    } finally {
      setIsConfirming(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const result = await exportOrdersToExcel()
      if (result.data) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))],
          { type: 'text/csv;charset=utf-8' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('주문 목록이 다운로드되었습니다.')
      } else {
        toast.error(result.error || '다운로드에 실패했습니다.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        )
        if (status === 'Ordered') {
          if (result.naverSyncResult?.success) {
            toast.success('발주확인 완료 (네이버 동기화 완료)')
          } else if (result.naverSyncResult?.error) {
            toast.success('발주확인 완료', {
              description: `네이버 동기화 실패: ${result.naverSyncResult.error}`,
            })
          } else {
            toast.success('발주확인 완료')
          }
        } else {
          toast.success('주문 상태가 변경되었습니다.')
        }
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.')
      }
    })
  }

  const handleOpenCancelDialog = (order: OrderTableItem) => {
    setCancelTargetOrder(order)
    setCancelDialogOpen(true)
  }

  const handleOpenTrackingInputDialog = (order: OrderTableItem) => {
    setTrackingTargetOrder(order)
    setTrackingInputDialogOpen(true)
  }

  const handleOpenTrackingViewDialog = (order: OrderTableItem) => {
    setTrackingTargetOrder(order)
    setTrackingViewDialogOpen(true)
  }

  const handleTrackingSuccess = () => {
    router.refresh()
  }

  const handleCancel = async () => {
    if (!cancelTargetOrder) return

    const result = await cancelOrder(cancelTargetOrder.id)
    if (result.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelTargetOrder.id ? { ...o, status: 'Cancelled' as OrderStatus } : o))
      )
      toast.success('주문이 취소되었습니다.')
    } else {
      toast.error(result.error || '주문 취소에 실패했습니다. 이미 배송 중인 주문은 취소할 수 없습니다.')
    }
    setCancelTargetOrder(null)
  }

  const handleCancelApprove = async (order: OrderTableItem) => {
    setCancelApproveTarget(order)
    setIsCancelProcessing(true)
    try {
      const result = await approveCancelRequest(order.id)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'Cancelled' as OrderStatus } : o))
        )
        toast.success('취소 요청이 승인되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '취소 승인에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
      setCancelApproveTarget(null)
    }
  }

  const handleOpenCancelRejectDialog = (order: OrderTableItem) => {
    setCancelRejectTarget(order)
    setClaimRejectType('cancel')
    setCancelRejectDialogOpen(true)
  }

  const handleCancelReject = async (reason: string) => {
    if (!cancelRejectTarget) return

    setIsCancelProcessing(true)
    try {
      const result = await rejectCancelRequest(cancelRejectTarget.id, reason)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === cancelRejectTarget.id ? { ...o, status: result.previousStatus || 'Ordered' } : o))
        )
        toast.success('취소 요청이 거부되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '취소 거부에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
      setCancelRejectDialogOpen(false)
      setCancelRejectTarget(null)
    }
  }

  const handleReturnApprove = async (order: OrderTableItem) => {
    setIsCancelProcessing(true)
    try {
      const result = await approveReturnRequest(order.id)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'Returned' as OrderStatus } : o))
        )
        toast.success('반품 요청이 승인되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '반품 승인에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
    }
  }

  const handleOpenReturnRejectDialog = (order: OrderTableItem) => {
    setCancelRejectTarget(order)
    setClaimRejectType('return')
    setCancelRejectDialogOpen(true)
  }

  const handleReturnReject = async (reason: string) => {
    if (!cancelRejectTarget) return

    setIsCancelProcessing(true)
    try {
      const result = await rejectReturnRequest(cancelRejectTarget.id, reason)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === cancelRejectTarget.id ? { ...o, status: result.previousStatus || 'Delivered' } : o))
        )
        toast.success('반품 요청이 거부되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '반품 거부에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
      setCancelRejectDialogOpen(false)
      setCancelRejectTarget(null)
    }
  }

  const handleExchangeApprove = async (order: OrderTableItem) => {
    setIsCancelProcessing(true)
    try {
      const result = await approveExchangeRequest(order.id)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'Exchanged' as OrderStatus } : o))
        )
        toast.success('교환 요청이 승인되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '교환 승인에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
    }
  }

  const handleOpenExchangeRejectDialog = (order: OrderTableItem) => {
    setCancelRejectTarget(order)
    setClaimRejectType('exchange')
    setCancelRejectDialogOpen(true)
  }

  const handleExchangeReject = async (reason: string) => {
    if (!cancelRejectTarget) return

    setIsCancelProcessing(true)
    try {
      const result = await rejectExchangeRequest(cancelRejectTarget.id, reason)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === cancelRejectTarget.id ? { ...o, status: result.previousStatus || 'Delivered' } : o))
        )
        toast.success('교환 요청이 거부되었습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '교환 거부에 실패했습니다.')
      }
    } finally {
      setIsCancelProcessing(false)
      setCancelRejectDialogOpen(false)
      setCancelRejectTarget(null)
    }
  }

  const handleClaimReject = async (reason: string) => {
    if (claimRejectType === 'cancel') {
      await handleCancelReject(reason)
    } else if (claimRejectType === 'return') {
      await handleReturnReject(reason)
    } else if (claimRejectType === 'exchange') {
      await handleExchangeReject(reason)
    }
  }

  return (
    <>
      <Header title="주문 관리" subtitle="Order Management" />

      <div className="flex-1 overflow-hidden p-3 lg:p-4 pb-16 lg:pb-4 flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {orders.length}건
              </Badge>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                  {pendingCount}건 발주확인 필요
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
              {syncStatus?.lastSyncAt ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(syncStatus.lastSyncAt)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>동기화 없음</span>
                </div>
              )}
              {syncStatus && !syncStatus.isEnabled && (
                <div className="flex items-center gap-1 text-warning">
                  <AlertCircle className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleNaverSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isSyncing && 'animate-spin')} />
              동기화
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCheckDeliveryStatus}
              disabled={isCheckingDelivery}
            >
              <Truck className={cn('h-3 w-3 mr-1', isCheckingDelivery && 'animate-pulse')} />
              배송확인
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              엑셀 다운로드
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 mb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="주문번호, SKU, 고객명 검색..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                  상태: {currentStatusLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={statusFilter === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                  기간: {currentPeriodLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {periodOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setPeriodFilter(option.value)}
                    className={periodFilter === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="overflow-x-auto h-full">
              <OrdersTable
                orders={filteredOrders}
                showSelection
                selectedIds={selectedOrderIds}
                onSelectionChange={setSelectedOrderIds}
                onStatusChange={handleStatusChange}
                onCancel={handleOpenCancelDialog}
                onTrackingInput={handleOpenTrackingInputDialog}
                onTrackingView={handleOpenTrackingViewDialog}
                onCancelApprove={handleCancelApprove}
                onCancelReject={handleOpenCancelRejectDialog}
                onReturnApprove={handleReturnApprove}
                onReturnReject={handleOpenReturnRejectDialog}
                onExchangeApprove={handleExchangeApprove}
                onExchangeReject={handleOpenExchangeRejectDialog}
              />
            </div>
          </CardContent>
        </Card>

        {selectedOrderIds.length > 0 && (
          <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-auto">
            <Card className="shadow-lg border-primary/20">
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <span className="text-sm font-medium">
                  {selectedOrderIds.length}건 선택됨
                  {selectedNewOrders.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (신규 {selectedNewOrders.length}건)
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  {selectedNewOrders.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkConfirm}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      일괄 발주확인 ({selectedNewOrders.length}건)
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/orders/send">
                      <Send className="h-4 w-4 mr-2" />
                      공급업체 전송
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <ConfirmDeleteDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          title="주문 취소"
          itemName={cancelTargetOrder ? `주문 #${cancelTargetOrder.platformOrderId}` : undefined}
          description={
            cancelTargetOrder
              ? `주문 #${cancelTargetOrder.platformOrderId} (${cancelTargetOrder.product.name})을(를) 취소하시겠습니까? 취소된 주문은 복구할 수 없습니다.`
              : undefined
          }
          onConfirm={handleCancel}
        />

        {trackingTargetOrder && (
          <>
            <TrackingNumberDialog
              open={trackingInputDialogOpen}
              onOpenChange={setTrackingInputDialogOpen}
              orderId={trackingTargetOrder.id}
              orderNumber={trackingTargetOrder.platformOrderId}
              currentTrackingNumber={trackingTargetOrder.trackingNumber}
              currentCourierCode={trackingTargetOrder.courierCode}
              onSuccess={handleTrackingSuccess}
            />

            <TrackingStatusDialog
              open={trackingViewDialogOpen}
              onOpenChange={setTrackingViewDialogOpen}
              trackingNumber={trackingTargetOrder.trackingNumber || ''}
              courierCode={trackingTargetOrder.courierCode || 'HANJIN'}
              orderNumber={trackingTargetOrder.platformOrderId}
            />
          </>
        )}

        {cancelRejectTarget && (
          <CancelRejectDialog
            open={cancelRejectDialogOpen}
            onOpenChange={setCancelRejectDialogOpen}
            orderNumber={cancelRejectTarget.platformOrderId}
            onConfirm={handleClaimReject}
            isLoading={isCancelProcessing}
            claimType={claimRejectType}
          />
        )}
      </div>
    </>
  )
}
