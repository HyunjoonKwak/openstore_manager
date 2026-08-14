'use client'

import { MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import type { OrderItemView } from '@/lib/actions/market-orders'
import type { ClaimAction } from '@/lib/markets/types'
import type { OrderItemStatusDb } from '@/types/redesign.types'

export const ORDER_STATUS_LABELS: Record<OrderItemStatusDb, string> = {
  New: '신규',
  Ordered: '발주확인',
  Dispatched: '발송처리',
  Delivering: '배송중',
  Delivered: '배송완료',
  Confirmed: '구매확정',
  CancelRequested: '취소요청',
  Cancelled: '취소',
  ReturnRequested: '반품요청',
  Returned: '반품완료',
  ExchangeRequested: '교환요청',
  Exchanged: '교환완료',
}

const STATUS_COLORS: Partial<Record<OrderItemStatusDb, string>> = {
  New: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Ordered: 'bg-primary/10 text-primary border-primary/20',
  Dispatched: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  Delivering: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  Delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
  Confirmed: 'bg-green-600/10 text-green-700 border-green-600/20',
  CancelRequested: 'bg-destructive/10 text-destructive border-destructive/20',
  ReturnRequested: 'bg-warning/10 text-warning border-warning/20',
  ExchangeRequested: 'bg-warning/10 text-warning border-warning/20',
}

/** Claim actions applicable to an item's current status. */
export function availableClaimActions(status: OrderItemStatusDb): ClaimAction[] {
  switch (status) {
    case 'New':
      return ['confirm_order']
    case 'CancelRequested':
      return ['approve_cancel', 'reject_cancel']
    case 'ReturnRequested':
      return ['approve_return', 'reject_return']
    case 'ExchangeRequested':
      return ['approve_exchange', 'reject_exchange']
    default:
      return []
  }
}

function formatWon(value: number | null) {
  return value === null ? '-' : `₩${value.toLocaleString('ko-KR')}`
}

function formatDate(value: string) {
  const date = new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function StatusBadge({ status }: { status: OrderItemStatusDb }) {
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap', STATUS_COLORS[status] || 'bg-muted text-muted-foreground')}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}

function ClaimMenu({
  item,
  onClaim,
  labels,
}: {
  item: OrderItemView
  onClaim: (item: OrderItemView, action: ClaimAction) => void
  labels: Record<ClaimAction, string>
}) {
  const actions = availableClaimActions(item.status)
  if (actions.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem key={action} onClick={() => onClaim(item, action)}>
            {labels[action]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function OrderItemsTable({
  items,
  onClaim,
  claimLabels,
}: {
  items: OrderItemView[]
  onClaim: (item: OrderItemView, action: ClaimAction) => void
  claimLabels: Record<ClaimAction, string>
}) {
  return (
    <>
      {/* Desktop: dense table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">주문일</TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">마켓</TableHead>
              <TableHead className="min-w-56 whitespace-nowrap text-xs font-semibold uppercase">상품</TableHead>
              <TableHead className="whitespace-nowrap text-center text-xs font-semibold uppercase">수량</TableHead>
              <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">금액</TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">수취인</TableHead>
              <TableHead className="whitespace-nowrap text-center text-xs font-semibold uppercase">상태</TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">송장</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="h-10 text-[13px]">
                <TableCell className="whitespace-nowrap py-1.5 tabular-nums text-muted-foreground">
                  {formatDate(item.orderedAt)}
                </TableCell>
                <TableCell className="py-1.5">
                  <PlatformBadge platform={item.platform} className="text-[11px]" />
                </TableCell>
                <TableCell className="py-1.5">
                  <p className="line-clamp-1 font-medium">{item.productName}</p>
                  {item.optionName && (
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.optionName}</p>
                  )}
                </TableCell>
                <TableCell className="py-1.5 text-center tabular-nums">{item.quantity}</TableCell>
                <TableCell className="whitespace-nowrap py-1.5 text-right tabular-nums">
                  {formatWon(item.totalAmount)}
                </TableCell>
                <TableCell className="whitespace-nowrap py-1.5">{item.receiverName || '-'}</TableCell>
                <TableCell className="py-1.5 text-center">
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap py-1.5 text-[12px] text-muted-foreground">
                  {item.trackingNumber ? `${item.courierCode} ${item.trackingNumber}` : '-'}
                </TableCell>
                <TableCell className="py-1.5">
                  <ClaimMenu item={item} onClaim={onClaim} labels={claimLabels} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card list — order checking + quick claim handling */}
      <div className="grid gap-2 lg:hidden">
        {items.map((item) => (
          <Card key={item.id} className="py-0">
            <CardContent className="space-y-1.5 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">{item.productName}</p>
                <ClaimMenu item={item} onClaim={onClaim} labels={claimLabels} />
              </div>
              {item.optionName && (
                <p className="text-xs text-muted-foreground">{item.optionName}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.receiverName || '-'} · {item.quantity}개
                </span>
                <span className="font-medium tabular-nums">{formatWon(item.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PlatformBadge platform={item.platform} className="text-[10px]" />
                  <span className="text-xs text-muted-foreground">{formatDate(item.orderedAt)}</span>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
