import { Header } from '@/components/layouts/Header'
import { getOrders, getDashboardStats, getWeeklyStats } from '@/lib/actions/orders'
import { getInquiryStats } from '@/lib/actions/inquiries'
import { getLastSyncTime } from '@/lib/actions/sync-schedules'
import { DashboardClient } from './DashboardClient'
import type { OrderTableItem } from '@/components/dashboard/OrdersTable'

export default async function DashboardPage() {
  const [ordersResult, statsResult, weeklyStatsResult, inquiryStatsResult, lastSyncResult] = await Promise.all([
    getOrders(),
    getDashboardStats(),
    getWeeklyStats(),
    getInquiryStats(),
    getLastSyncTime(),
  ])

  const orders: OrderTableItem[] = (ordersResult.data || []).slice(0, 10).map((order) => ({
    id: order.id,
    platformOrderId: order.platformOrderId,
    product: {
      name: order.product.name,
      sku: order.product.sku,
    },
    customer: order.customer,
    date: order.date,
    total: order.total,
    quantity: order.quantity,
    status: order.status,
  }))

  const stats = statsResult.data || {
    dailyRevenue: 0,
    revenueChange: 0,
    todayOrders: 0,
    flow: { newOrders: 0, preparing: 0, shipping: 0, delivered: 0, confirmed: 0 },
    claims: { cancelRequests: 0, returnRequests: 0, exchangeRequests: 0, delayedShipping: 0 },
    settlement: { today: 0, expected: 0 },
  }

  const weeklyStats = weeklyStatsResult.data || []
  const revenueChartData = weeklyStats.map((s) => ({
    label: s.date,
    value: s.revenue,
  }))

  const inquiryStats = inquiryStatsResult.data || {
    totalInquiries: 0,
    unansweredInquiries: 0,
    totalQnas: 0,
    unansweredQnas: 0,
  }

  const lastSyncAt = lastSyncResult.data || null

  return (
    <>
      <Header title="대시보드" subtitle="스토어 현황" />
      <DashboardClient
        orders={orders}
        stats={stats}
        weeklyStats={revenueChartData}
        inquiryStats={inquiryStats}
        lastSyncAt={lastSyncAt}
      />
    </>
  )
}
