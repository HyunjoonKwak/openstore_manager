'use client'

import { useState } from 'react'
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
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
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'

export interface OrderTableItem {
  id: string
  platformOrderId: string
  product: {
    name: string
    sku: string
  }
  customer: {
    name: string
    initials: string
    color: string
  }
  date: string
  total: number
  quantity: number
  status: OrderStatus
}

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

export function OrdersTable({
  orders,
  showSelection = false,
  selectedIds = [],
  onSelectionChange,
  onStatusChange,
  onCancel,
}: OrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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

  return (
    <div className="flex flex-col h-full">
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
              <TableHead className="text-xs font-semibold uppercase">주문번호</TableHead>
              <TableHead className="text-xs font-semibold uppercase">상품</TableHead>
              <TableHead className="text-xs font-semibold uppercase">고객</TableHead>
              <TableHead className="text-xs font-semibold uppercase">날짜</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-right">금액</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-center">상태</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-center w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => {
              const isSelected = selectedIds.includes(order.id)
              const status = statusConfig[order.status]

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
                  <TableCell className="font-medium text-primary">
                    #{order.platformOrderId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                        {order.product.sku.slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{order.product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          SKU: {order.product.sku}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className={cn('text-[10px] text-white', order.customer.color)}>
                          {order.customer.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{order.customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-right">
                    {formatPrice(order.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn('text-xs', status.className)}>
                      {order.status === 'New' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse mr-1" />
                      )}
                      {status.label}
                    </Badge>
                  </TableCell>
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

      <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-background">
        <div className="text-xs text-muted-foreground">
          총 {orders.length}건 중 {(currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, orders.length)}건 표시
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
