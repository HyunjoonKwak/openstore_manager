import { TrendingUp, ShoppingBag, Package, Download, Filter, ChevronDown, BarChart3, PieChart } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KPICard, TrendFooter, LinkFooter } from '@/components/dashboard/KPICard'
import { OrdersTable, type OrderTableItem } from '@/components/dashboard/OrdersTable'
import { SimpleBarChart, StatusDonut } from '@/components/dashboard/SimpleChart'
import { getOrders, getOrderStats, getWeeklyStats, getOrderStatusCounts } from '@/lib/actions/orders'

const defaultKPIData = {
  dailyRevenue: 0,
  revenueChange: 0,
  newOrders: 0,
  pendingOrders: 0,
  totalOrders: 0,
}

export default async function DashboardPage() {
  const [ordersResult, statsResult, weeklyStatsResult, statusCountsResult] = await Promise.all([
    getOrders(),
    getOrderStats(),
    getWeeklyStats(),
    getOrderStatusCounts(),
  ])

  const orders: OrderTableItem[] = (ordersResult.data || []).map((order) => ({
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

  const kpiData = statsResult.data || defaultKPIData

  const weeklyStats = weeklyStatsResult.data || []
  const revenueChartData = weeklyStats.map((s) => ({
    label: s.date,
    value: s.revenue,
  }))
  const ordersChartData = weeklyStats.map((s) => ({
    label: s.date,
    value: s.orders,
  }))

  const statusColors: Record<string, string> = {
    New: '#3b82f6',
    Ordered: '#f59e0b',
    Shipped: '#22c55e',
    Cancelled: '#ef4444',
  }
  const statusLabels: Record<string, string> = {
    New: '신규',
    Ordered: '발주완료',
    Shipped: '배송완료',
    Cancelled: '취소',
  }
  const statusDonutData = (statusCountsResult.data || []).map((s) => ({
    label: statusLabels[s.status] || s.status,
    value: s.count,
    color: statusColors[s.status] || '#888888',
  }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }



  return (
    <>
      <Header title="Command Center" subtitle="Dashboard" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="일일 매출"
            value={formatCurrency(kpiData.dailyRevenue)}
            icon={<TrendingUp className="h-5 w-5" />}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-500"
            footer={
              <TrendFooter
                value={`${kpiData.revenueChange >= 0 ? '+' : ''}${kpiData.revenueChange}%`}
                label="전일 대비"
                isPositive={kpiData.revenueChange > 0}
              />
            }
          />

          <KPICard
            title="신규 주문"
            value={String(kpiData.newOrders)}
            icon={<ShoppingBag className="h-5 w-5" />}
            iconBgColor="bg-primary/10"
            iconColor="text-primary"
            footer={
              <LinkFooter
                value={`${kpiData.pendingOrders}건 처리대기`}
                label="조치필요"
                color="text-primary"
              />
            }
          />

          <KPICard
            title="총 주문"
            value={String(kpiData.totalOrders)}
            icon={<Package className="h-5 w-5" />}
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-400"
            footer={
              <LinkFooter
                value="전체 주문 보기"
                label=""
                color="text-muted-foreground"
              />
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">주간 매출 추이</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                최근 7일
              </Badge>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={revenueChartData}
                height={140}
                barColor="bg-primary"
                formatType="currency"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">주문 현황</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <StatusDonut data={statusDonutData} size={140} />
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col h-[calc(100vh-580px)] min-h-[300px]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-bold">최근 주문</CardTitle>
              <Badge variant="secondary" className="bg-primary/20 text-primary border border-primary/30">
                Live Feed
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <span>플랫폼: 전체</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <span>상태: 활성</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Filter className="h-4 w-4" />
                <span>필터</span>
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <OrdersTable orders={orders} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
