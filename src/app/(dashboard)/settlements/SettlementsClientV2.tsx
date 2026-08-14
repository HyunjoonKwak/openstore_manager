'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { MarketFilterChips } from '@/components/layouts/MarketFilterChips'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { cn } from '@/lib/utils'
import { useMarketFilter, filterToAccountId } from '@/contexts/MarketFilterContext'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import { syncSettlementsFromMarket } from '@/lib/actions/market-sync'
import type { SettlementView } from '@/lib/actions/market-settlements'

function formatWon(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`
}

export function SettlementsClientV2({ initialSettlements }: { initialSettlements: SettlementView[] }) {
  const router = useRouter()
  const { accounts, filter } = useMarketFilter()
  const [isSyncing, setIsSyncing] = useState(false)

  const filtered = useMemo(() => {
    const accountId = filterToAccountId(filter)
    return accountId
      ? initialSettlements.filter((settlement) => settlement.marketAccountId === accountId)
      : initialSettlements
  }, [initialSettlements, filter])

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, settlement) => ({
          sales: acc.sales + settlement.salesAmount,
          commission: acc.commission + settlement.commissionAmount,
          settlement: acc.settlement + settlement.settlementAmount,
        }),
        { sales: 0, commission: 0, settlement: 0 }
      ),
    [filtered]
  )

  const handleSync = async () => {
    const targets = filterToAccountId(filter)
      ? accounts.filter((account) => account.id === filter)
      : accounts
    if (targets.length === 0) {
      toast.error('연결된 마켓 계정이 없습니다.')
      return
    }
    setIsSyncing(true)
    try {
      for (const account of targets) {
        const result = await syncSettlementsFromMarket(account.id, 30)
        if (result.success) toast.success(`${account.name}: ${result.syncedCount}건 동기화`)
        else toast.error(`${account.name}: ${result.error}`)
      }
      router.refresh()
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <>
      <Header title="정산" subtitle="Settlements" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <MarketFilterChips />
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn('mr-1.5 h-4 w-4', isSyncing && 'animate-spin')} />
            정산 동기화 (최근 30일)
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: '매출 합계', value: totals.sales },
            { label: '수수료 합계', value: totals.commission },
            { label: '정산 합계', value: totals.settlement },
          ].map((item) => (
            <Card key={item.label} className="py-3 sm:py-4">
              <CardContent className="px-4 py-0">
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold tabular-nums sm:text-xl">{formatWon(item.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Wallet className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">정산 데이터가 없습니다</p>
            <p className="text-sm">동기화를 실행하면 마켓의 일별 정산을 가져옵니다.</p>
          </div>
        ) : (
          <Card className="py-0">
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">정산일</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">마켓</TableHead>
                    <TableHead className="whitespace-nowrap text-center text-xs font-semibold uppercase">주문수</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">매출</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">수수료</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">배송비</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">정산금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((settlement) => (
                    <TableRow key={settlement.id} className="h-10 text-[13px]">
                      <TableCell className="whitespace-nowrap py-1.5 tabular-nums">
                        {settlement.settlementDate}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <PlatformBadge platform={settlement.platform} className="text-[11px]" />
                      </TableCell>
                      <TableCell className="py-1.5 text-center tabular-nums">
                        {settlement.orderCount}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1.5 text-right tabular-nums">
                        {formatWon(settlement.salesAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1.5 text-right tabular-nums text-muted-foreground">
                        -{formatWon(settlement.commissionAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1.5 text-right tabular-nums text-muted-foreground">
                        {formatWon(settlement.deliveryFeeAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1.5 text-right font-medium tabular-nums">
                        {formatWon(settlement.settlementAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </Card>
        )}
      </div>
    </>
  )
}
