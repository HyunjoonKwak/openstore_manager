'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter, Download, Play, Send, Printer, Archive, ChevronDown, Search, RefreshCw, Upload, FileSpreadsheet, Clock, AlertCircle } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { OrdersTable, type OrderTableItem } from '@/components/dashboard/OrdersTable'
import { updateOrderStatus, cancelOrder } from '@/lib/actions/orders'
import { syncNaverOrders } from '@/lib/actions/naver-sync'
import { uploadOrdersFromExcel, generateOrderTemplate } from '@/lib/actions/excel-upload'
import { getStoreSyncStatus, type SyncStatus } from '@/lib/actions/store-management'
import { useStore } from '@/contexts/StoreContext'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface OrdersClientProps {
  initialOrders: OrderTableItem[]
}

export function OrdersClient({ initialOrders }: OrdersClientProps) {
  const router = useRouter()
  const { currentStore } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  const pendingCount = orders.filter((o) => o.status === 'New').length

  useEffect(() => {
    if (currentStore?.id) {
      loadSyncStatus()
    }
  }, [currentStore?.id])

  async function loadSyncStatus() {
    if (!currentStore?.id) return
    const result = await getStoreSyncStatus(currentStore.id)
    if (result.data) {
      setSyncStatus(result.data)
    }
  }

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

  const formatNextSync = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins <= 0) return '곧 동기화'
    if (diffMins < 60) return `${diffMins}분 후`
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}시간 후`
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.platformOrderId.toLowerCase().includes(query) ||
      order.product.name.toLowerCase().includes(query) ||
      order.product.sku.toLowerCase().includes(query) ||
      order.customer.name.toLowerCase().includes(query)
    )
  })

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

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadOrdersFromExcel(formData)
      if (result.success) {
        toast.success(`${result.importedCount}건의 주문이 등록되었습니다.`)
        router.refresh()
      } else {
        toast.error(result.error || '업로드에 실패했습니다.')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const base64 = await generateOrderTemplate()
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '주문_템플릿.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('템플릿이 다운로드되었습니다.')
    } catch {
      toast.error('템플릿 다운로드에 실패했습니다.')
    }
  }

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        )
        toast.success('주문 상태가 변경되었습니다.')
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.')
      }
    })
  }

  const handleCancel = (orderId: string) => {
    startTransition(async () => {
      const result = await cancelOrder(orderId)
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'Cancelled' as OrderStatus } : o))
        )
        toast.success('주문이 취소되었습니다.')
      } else {
        toast.error(result.error || '주문 취소에 실패했습니다.')
      }
    })
  }

  return (
    <>
      <Header title="주문 관리" subtitle="Order Management" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleExcelUpload}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">전체 주문</h2>
            <Badge variant="secondary">
              {orders.length}건
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {pendingCount}건 조치필요
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {syncStatus && (
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                {syncStatus.lastSyncAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>마지막: {formatRelativeTime(syncStatus.lastSyncAt)}</span>
                  </div>
                )}
                {syncStatus.isEnabled && syncStatus.nextSyncAt && (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    <span>다음: {formatNextSync(syncStatus.nextSyncAt)}</span>
                  </div>
                )}
                {!syncStatus.isEnabled && (
                  <div className="flex items-center gap-1 text-warning">
                    <AlertCircle className="h-3 w-3" />
                    <span>자동동기화 꺼짐</span>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNaverSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
              네이버 동기화
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? '업로드 중...' : '엑셀 업로드'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              템플릿 다운로드
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
            <Button size="sm" disabled={isPending}>
              <Play className="h-4 w-4 mr-2" />
              일괄 처리
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="주문번호, SKU, 고객명 검색..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              상태: 전체
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              기간: 최근 7일
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              공급업체: 전체
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              상세필터
            </Button>
          </div>
        </div>

        <Card className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
            <CardTitle className="text-base font-semibold">주문 목록</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <OrdersTable
              orders={filteredOrders}
              showSelection
              selectedIds={selectedOrderIds}
              onSelectionChange={setSelectedOrderIds}
              onStatusChange={handleStatusChange}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>

        {selectedOrderIds.length > 0 && (
          <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-auto">
            <Card className="shadow-lg border-primary/20">
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <span className="text-sm font-medium">
                  {selectedOrderIds.length}건 선택됨
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    라벨출력
                  </Button>
                  <Button variant="outline" size="sm">
                    <Archive className="h-4 w-4 mr-2" />
                    보관
                  </Button>
                  <Button size="sm" asChild>
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
      </div>
    </>
  )
}
