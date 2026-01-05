'use client'

import { useState, useEffect, useTransition } from 'react'
import { Calendar, RefreshCw, TrendingUp, TrendingDown, DollarSign, Loader2, FileText } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { syncSettlements, getSettlements } from '@/lib/actions/naver-sync'

interface Settlement {
  id: string
  settlementDate: string
  orderCount: number
  salesAmount: number
  commissionAmount: number
  deliveryFeeAmount: number
  discountAmount: number
  settlementAmount: number
  status: string
}

export default function SettlementsPage() {
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [dateRange, setDateRange] = useState({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
  })

  function getDefaultStartDate() {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  }

  function getDefaultEndDate() {
    return new Date().toISOString().split('T')[0]
  }

  useEffect(() => {
    loadSettlements()
  }, [])

  async function loadSettlements() {
    startTransition(async () => {
      const result = await getSettlements({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })

      if (result.data) {
        setSettlements(result.data)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const result = await syncSettlements({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })

      if (result.success) {
        toast.success(`${result.syncedCount}건의 정산 데이터를 동기화했습니다.`)
        loadSettlements()
      } else {
        toast.error(result.error || '동기화 실패')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalStats = settlements.reduce(
    (acc, s) => ({
      salesAmount: acc.salesAmount + s.salesAmount,
      commissionAmount: acc.commissionAmount + s.commissionAmount,
      settlementAmount: acc.settlementAmount + s.settlementAmount,
      orderCount: acc.orderCount + s.orderCount,
    }),
    { salesAmount: 0, commissionAmount: 0, settlementAmount: 0, orderCount: 0 }
  )

  return (
    <>
      <Header title="정산 관리" subtitle="Settlements" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-green-500/10 p-2 text-green-500">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 매출</p>
                <p className="text-lg font-bold">{formatCurrency(totalStats.salesAmount)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">수수료</p>
                <p className="text-lg font-bold">{formatCurrency(totalStats.commissionAmount)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">정산금액</p>
                <p className="text-lg font-bold">{formatCurrency(totalStats.settlementAmount)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 주문건</p>
                <p className="text-lg font-bold">{totalStats.orderCount}건</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
            <CardTitle className="text-lg font-bold">정산 내역</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-36 h-8"
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-36 h-8"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadSettlements} disabled={isPending}>
                조회
              </Button>
              <Button size="sm" onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                동기화
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : settlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  정산 데이터가 없습니다. 동기화를 실행해주세요.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>정산일</TableHead>
                    <TableHead className="text-right">주문건수</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                    <TableHead className="text-right">수수료</TableHead>
                    <TableHead className="text-right">배송비</TableHead>
                    <TableHead className="text-right">할인액</TableHead>
                    <TableHead className="text-right">정산금액</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">
                        {formatDate(settlement.settlementDate)}
                      </TableCell>
                      <TableCell className="text-right">{settlement.orderCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(settlement.salesAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        -{formatCurrency(settlement.commissionAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(settlement.deliveryFeeAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        -{formatCurrency(settlement.discountAmount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-500">
                        {formatCurrency(settlement.settlementAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            settlement.status === 'paid'
                              ? 'default'
                              : settlement.status === 'confirmed'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {settlement.status === 'paid'
                            ? '지급완료'
                            : settlement.status === 'confirmed'
                            ? '확정'
                            : '대기'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
