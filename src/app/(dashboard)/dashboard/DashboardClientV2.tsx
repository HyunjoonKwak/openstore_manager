'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  PackageX,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { MarketFilterChips } from '@/components/layouts/MarketFilterChips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMarketFilter, filterToAccountId } from '@/contexts/MarketFilterContext'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import type { OrderItemView } from '@/lib/actions/market-orders'
import type { MasterProductWithListings } from '@/lib/actions/master-products'
import { StatusBadge } from '../orders/components/OrderItemsTable'

// Unified dashboard: KPI strip + recent orders across every market.
// Mobile keeps the same layout — this is a check-in screen.

function formatWon(value: number | null) {
  return value === null ? '-' : `₩${value.toLocaleString('ko-KR')}`
}

export function DashboardClientV2({
  orderItems,
  products,
}: {
  orderItems: OrderItemView[]
  products: MasterProductWithListings[]
}) {
  const { filter } = useMarketFilter()

  const scopedItems = useMemo(() => {
    const accountId = filterToAccountId(filter)
    return accountId
      ? orderItems.filter((item) => item.marketAccountId === accountId)
      : orderItems
  }, [orderItems, filter])

  const newCount = scopedItems.filter((item) => item.status === 'New').length
  const dispatchWaiting = scopedItems.filter((item) =>
    ['New', 'Ordered'].includes(item.status)
  ).length
  const claimCount = scopedItems.filter((item) =>
    ['CancelRequested', 'ReturnRequested', 'ExchangeRequested'].includes(item.status)
  ).length
  const lowStockCount = products.filter((product) => product.stockQuantity <= 10).length

  const today = new Date()
  const todaySales = scopedItems
    .filter((item) => {
      const date = new Date(item.orderedAt)
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate() &&
        !['Cancelled', 'Returned'].includes(item.status)
      )
    })
    .reduce((sum, item) => sum + (item.totalAmount || 0), 0)

  const kpis = [
    { label: '신규 주문', value: newCount, icon: ShoppingCart, href: '/orders', color: 'text-blue-500' },
    { label: '발송 대기', value: dispatchWaiting, icon: Truck, href: '/orders/dispatch', color: 'text-primary' },
    { label: '클레임', value: claimCount, icon: AlertTriangle, href: '/orders', color: claimCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: '재고 부족', value: lowStockCount, icon: PackageX, href: '/products/stock', color: lowStockCount > 0 ? 'text-warning' : 'text-muted-foreground' },
  ]

  const recentItems = scopedItems.slice(0, 8)

  return (
    <>
      <Header title="대시보드" subtitle="전 마켓 통합 현황" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-4">
          <MarketFilterChips />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="py-3 transition-all hover:ring-2 hover:ring-primary/50 sm:py-4">
                <CardContent className="flex items-center gap-3 px-4 py-0">
                  <div className={cn('rounded-lg bg-muted p-2', kpi.color)}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          <Card className="col-span-2 py-3 sm:py-4 lg:col-span-1">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">오늘 매출</p>
              <p className="text-xl font-bold tabular-nums">{formatWon(todaySales)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center justify-between text-base">
              최근 주문
              <Link
                href="/orders"
                className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-primary"
              >
                전체 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                아직 주문이 없습니다. 주문 화면에서 동기화를 실행해보세요.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <PlatformBadge platform={item.platform} className="shrink-0 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.receiverName || '-'} · {item.quantity}개
                      </p>
                    </div>
                    <span className="hidden whitespace-nowrap text-sm tabular-nums sm:block">
                      {formatWon(item.totalAmount)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
