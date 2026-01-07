'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, AlertTriangle, TrendingUp, ShoppingCart, BarChart3, MessageSquare, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrderFlowCard, QuickStatCard, SettlementCard } from '@/components/dashboard/OrderFlowCard'
import { OrdersTable, type OrderTableItem } from '@/components/dashboard/OrdersTable'
import { SimpleBarChart } from '@/components/dashboard/SimpleChart'
import { syncNaverOrders } from '@/lib/actions/naver-sync'
import { checkDeliveryStatusBatch } from '@/lib/actions/orders'
import { toast } from 'sonner'

interface DashboardStats {
  dailyRevenue: number
  revenueChange: number
  todayOrders: number
  flow: { newOrders: number; preparing: number; shipping: number; delivered: number; confirmed: number }
  claims: { cancelRequests: number; returnRequests: number; exchangeRequests: number; delayedShipping: number }
  settlement: { today: number; expected: number }
}

interface InquiryStats {
  totalInquiries: number
  unansweredInquiries: number
  totalQnas: number
  unansweredQnas: number
}

interface DashboardClientProps {
  orders: OrderTableItem[]
  stats: DashboardStats
  weeklyStats: { label: string; value: number }[]
  inquiryStats: InquiryStats
  lastSyncAt: string | null
}

export function DashboardClient({
  orders,
  stats,
  weeklyStats,
  inquiryStats,
  lastSyncAt,
}: DashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const [ordersResult, deliveryResult] = await Promise.all([
        syncNaverOrders({}),
        checkDeliveryStatusBatch(),
      ])

      const messages: string[] = []

      if (ordersResult.success) {
        if (ordersResult.syncedCount > 0) {
          messages.push(`신규 주문 ${ordersResult.syncedCount}건`)
        }
      } else {
        toast.error(ordersResult.error || '주문 동기화 실패')
      }

      if (deliveryResult.success) {
        if (deliveryResult.updated > 0) {
          messages.push(`배송상태 ${deliveryResult.updated}건 업데이트`)
        }
      } else {
        toast.error(deliveryResult.error || '배송상태 확인 실패')
      }

      if (messages.length > 0) {
        toast.success(messages.join(', '))
      } else if (ordersResult.success && deliveryResult.success) {
        toast.info('변경사항 없음')
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      toast.error('동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSyncing(false)
    }
  }

  const isLoading = isSyncing || isCheckingDelivery || isPending

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return '없음'
    const date = new Date(isoString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return isToday ? time : `${date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ${time}`
  }

  const currentTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 pb-20 lg:pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>현재 {currentTime}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>마지막 동기화: {formatSyncTime(lastSyncAt)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          동기화
        </Button>
      </div>

      <OrderFlowCard
        title="판매 관리"
        icon={<Package className="h-5 w-5" />}
        steps={[
          { label: '신규주문', count: stats.flow.newOrders, href: '/orders?status=New', highlight: true },
          { label: '배송준비', count: stats.flow.preparing, href: '/orders?status=Ordered,Dispatched' },
          { label: '배송중', count: stats.flow.shipping, href: '/orders?status=Delivering' },
          { label: '배송완료', count: stats.flow.delivered, href: '/orders?status=Delivered' },
          { label: '구매확정', count: stats.flow.confirmed, href: '/orders?status=Confirmed' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SettlementCard
          todaySettlement={stats.settlement.today}
          expectedSettlement={stats.settlement.expected}
        />

        <QuickStatCard
          title="클레임 / 지연"
          icon={<AlertTriangle className="h-5 w-5" />}
          items={[
            { 
              label: '취소요청', 
              value: stats.claims.cancelRequests, 
              href: '/orders?status=CancelRequested',
              highlight: stats.claims.cancelRequests > 0 
            },
            { 
              label: '반품요청', 
              value: stats.claims.returnRequests, 
              href: '/orders?status=ReturnRequested',
              highlight: stats.claims.returnRequests > 0 
            },
            { 
              label: '교환요청', 
              value: stats.claims.exchangeRequests, 
              href: '/orders?status=ExchangeRequested',
              highlight: stats.claims.exchangeRequests > 0 
            },
            { 
              label: '발송지연', 
              value: stats.claims.delayedShipping, 
              href: '/orders?status=New&delayed=true',
              highlight: stats.claims.delayedShipping > 0 
            },
          ]}
        />

        <QuickStatCard
          title="고객 문의"
          icon={<MessageSquare className="h-5 w-5" />}
          items={[
            { 
              label: '미답변 문의', 
              value: inquiryStats.unansweredInquiries,
              highlight: inquiryStats.unansweredInquiries > 0 
            },
            { 
              label: '미답변 Q&A', 
              value: inquiryStats.unansweredQnas,
              highlight: inquiryStats.unansweredQnas > 0 
            },
          ]}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">오늘 매출</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-primary">{formatCurrency(stats.dailyRevenue)}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">주문 {stats.todayOrders}건</span>
                {stats.revenueChange !== 0 && (
                  <Badge variant={stats.revenueChange > 0 ? 'default' : 'destructive'} className="text-sm">
                    {stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">주간 매출 추이</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">최근 7일</Badge>
          </CardHeader>
          <CardContent className="p-3">
            <SimpleBarChart
              data={weeklyStats}
              height={100}
              barColor="bg-primary"
              formatType="currency"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">빠른 작업</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/orders/dispatch"
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">발송처리</span>
                {stats.flow.newOrders > 0 && (
                  <Badge variant="default" className="text-xs">{stats.flow.newOrders}건 대기</Badge>
                )}
              </a>
              <a
                href="/orders/send"
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">발주하기</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">최근 주문</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Live
            </Badge>
          </div>
          <a href="/orders" className="text-xs text-primary hover:underline">
            전체보기
          </a>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <OrdersTable orders={orders} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
