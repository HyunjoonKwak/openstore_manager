'use client'

import { useState, useEffect } from 'react'
import { MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'

export interface OrderTableItem {
  id: string
  platformOrderId: string
  naverOrderId?: string
  product: {
    name: string
    sku: string
    option?: string
  }
  customer: {
    name: string
    initials: string
    color: string
    tel?: string
  }
  receiver?: {
    name: string
    tel: string
    address: string
    zipCode: string
    memo?: string
  }
  date: string
  total: number
  unitPrice?: number
  quantity: number
  status: OrderStatus
  naverStatus?: string
  trackingNumber?: string
  courierCode?: string
}

export type OrderColumnKey = 
  | 'platformOrderId'
  | 'naverOrderId' 
  | 'productName'
  | 'productOption'
  | 'customerName'
  | 'customerTel'
  | 'receiverName'
  | 'receiverTel'
  | 'receiverAddress'
  | 'zipCode'
  | 'deliveryMemo'
  | 'date'
  | 'quantity'
  | 'unitPrice'
  | 'total'
  | 'status'
  | 'naverStatus'
  | 'trackingNumber'

export interface ColumnConfig {
  key: OrderColumnKey
  label: string
  visible: boolean
  width?: string
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'platformOrderId', label: '주문번호', visible: true },
  { key: 'naverOrderId', label: '네이버주문번호', visible: false },
  { key: 'productName', label: '상품명', visible: true },
  { key: 'productOption', label: '옵션', visible: false },
  { key: 'customerName', label: '주문자', visible: true },
  { key: 'customerTel', label: '주문자연락처', visible: false },
  { key: 'receiverName', label: '수령인', visible: false },
  { key: 'receiverTel', label: '수령인연락처', visible: false },
  { key: 'receiverAddress', label: '배송지', visible: false },
  { key: 'zipCode', label: '우편번호', visible: false },
  { key: 'deliveryMemo', label: '배송메모', visible: false },
  { key: 'date', label: '주문일시', visible: true },
  { key: 'quantity', label: '수량', visible: false },
  { key: 'unitPrice', label: '단가', visible: false },
  { key: 'total', label: '결제금액', visible: true },
  { key: 'status', label: '상태', visible: true },
  { key: 'naverStatus', label: '네이버상태', visible: false },
  { key: 'trackingNumber', label: '운송장번호', visible: false },
]

const STORAGE_KEY = 'order-table-columns'
const PAGE_SIZE_KEY = 'order-table-page-size'
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const

interface OrdersTableProps {
  orders: OrderTableItem[]
  showSelection?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  onCancel?: (orderId: string) => void
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  New: {
    label: '신규',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  Ordered: {
    label: '주문완료',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  Shipped: {
    label: '배송완료',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  Cancelled: {
    label: '취소',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

function loadColumns(): ColumnConfig[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnConfig[]
      const savedKeys = new Set(parsed.map(c => c.key))
      const merged = parsed.filter(c => DEFAULT_COLUMNS.some(d => d.key === c.key))
      DEFAULT_COLUMNS.forEach(dc => {
        if (!savedKeys.has(dc.key)) merged.push(dc)
      })
      return merged
    }
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS
}

function saveColumns(columns: ColumnConfig[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
}

function loadPageSize(): number {
  if (typeof window === 'undefined') return 20
  try {
    const saved = localStorage.getItem(PAGE_SIZE_KEY)
    if (saved) {
      const size = parseInt(saved, 10)
      if (PAGE_SIZE_OPTIONS.includes(size as typeof PAGE_SIZE_OPTIONS[number])) {
        return size
      }
    }
  } catch { /* ignore */ }
  return 20
}

function savePageSize(size: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PAGE_SIZE_KEY, String(size))
}

export function OrdersTable({
  orders,
  showSelection = false,
  selectedIds = [],
  onSelectionChange,
  onStatusChange,
  onCancel,
}: OrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  
  useEffect(() => {
    setColumns(loadColumns())
    setPageSize(loadPageSize())
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [orders.length, pageSize])

  const toggleColumn = (key: OrderColumnKey) => {
    const updated = columns.map(c => 
      c.key === key ? { ...c, visible: !c.visible } : c
    )
    setColumns(updated)
    saveColumns(updated)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    savePageSize(size)
    setCurrentPage(1)
  }

  const visibleColumns = columns.filter(c => c.visible)

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))
  const paginatedOrders = orders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  
  const startIndex = orders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, orders.length)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(orders.map((o) => o.id))
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id])
    } else {
      onSelectionChange?.(selectedIds.filter((i) => i !== id))
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderCellValue = (order: OrderTableItem, columnKey: OrderColumnKey) => {
    switch (columnKey) {
      case 'platformOrderId':
        return <span className="font-medium text-primary">#{order.platformOrderId}</span>
      case 'naverOrderId':
        return <span className="text-xs text-muted-foreground">{order.naverOrderId || '-'}</span>
      case 'productName':
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center text-xs font-medium shrink-0">
              {order.product.sku?.slice(0, 2) || 'N'}
            </div>
            <span className="text-sm font-medium truncate max-w-[200px]">{order.product.name}</span>
          </div>
        )
      case 'productOption':
        return <span className="text-sm text-muted-foreground">{order.product.option || '-'}</span>
      case 'customerName':
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className={cn('text-[10px] text-white', order.customer.color)}>
                {order.customer.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{order.customer.name}</span>
          </div>
        )
      case 'customerTel':
        return <span className="text-sm">{order.customer.tel || '-'}</span>
      case 'receiverName':
        return <span className="text-sm">{order.receiver?.name || '-'}</span>
      case 'receiverTel':
        return <span className="text-sm">{order.receiver?.tel || '-'}</span>
      case 'receiverAddress':
        return <span className="text-sm truncate max-w-[250px]">{order.receiver?.address || '-'}</span>
      case 'zipCode':
        return <span className="text-sm">{order.receiver?.zipCode || '-'}</span>
      case 'deliveryMemo':
        return <span className="text-sm truncate max-w-[150px]">{order.receiver?.memo || '-'}</span>
      case 'date':
        return <span className="text-sm text-muted-foreground">{formatDate(order.date)}</span>
      case 'quantity':
        return <span className="text-sm">{order.quantity}</span>
      case 'unitPrice':
        return <span className="text-sm">{order.unitPrice ? formatPrice(order.unitPrice) : '-'}</span>
      case 'total':
        return <span className="text-sm font-medium">{formatPrice(order.total)}</span>
      case 'status':
        const status = statusConfig[order.status]
        return (
          <Badge variant="outline" className={cn('text-xs', status.className)}>
            {order.status === 'New' && (
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse mr-1" />
            )}
            {status.label}
          </Badge>
        )
      case 'naverStatus':
        return <span className="text-xs">{order.naverStatus || '-'}</span>
      case 'trackingNumber':
        return <span className="text-sm font-mono">{order.trackingNumber || '-'}</span>
      default:
        return '-'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-4 py-2 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              컬럼 설정
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>표시할 컬럼 선택</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={col.visible}
                onCheckedChange={() => toggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            <TableRow>
              {showSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === orders.length && orders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className="text-xs font-semibold uppercase whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase text-center w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => {
              const isSelected = selectedIds.includes(order.id)

              return (
                <TableRow
                  key={order.id}
                  className={cn(
                    'hover:bg-card/50 transition-colors',
                    order.status === 'Cancelled' && 'bg-destructive/5',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {showSelection && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectOne(order.id, checked as boolean)
                        }
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      {renderCellValue(order, col.key)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onStatusChange?.(order.id, 'Ordered')}
                          disabled={order.status !== 'New'}
                        >
                          주문확정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onStatusChange?.(order.id, 'Shipped')}
                          disabled={order.status === 'Shipped' || order.status === 'Cancelled'}
                        >
                          배송완료
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onCancel?.(order.id)}
                          disabled={order.status === 'Cancelled' || order.status === 'Shipped'}
                        >
                          취소
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">표시</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-7 px-2 text-xs border rounded bg-background"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}개</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-muted-foreground">
            총 {orders.length}건 중 {startIndex}-{endIndex}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (val >= 1 && val <= totalPages) setCurrentPage(val)
              }}
              className="w-12 h-7 text-center text-xs border rounded bg-background"
            />
            <span className="text-xs text-muted-foreground">/ {totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
