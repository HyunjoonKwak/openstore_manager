'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { MarketFilterChips } from '@/components/layouts/MarketFilterChips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { cn } from '@/lib/utils'
import { useMarketFilter, filterToAccountId } from '@/contexts/MarketFilterContext'
import { processOrderClaim, type OrderItemView } from '@/lib/actions/market-orders'
import { syncOrdersFromMarket } from '@/lib/actions/market-sync'
import type { ClaimAction } from '@/lib/markets/types'
import type { OrderItemStatusDb } from '@/types/redesign.types'
import { OrderItemsTable, ORDER_STATUS_LABELS } from './components/OrderItemsTable'
import { ClaimActionDialog, CLAIM_LABELS } from './components/ClaimActionDialog'

// Unified order list across markets. Status tabs group the lifecycle;
// claims route through the adapter with explicit confirmation.

type StatusTab = 'all' | 'New' | 'Ordered' | 'shipping' | 'done' | 'claims'

const STATUS_TABS: Array<{ key: StatusTab; label: string; statuses: OrderItemStatusDb[] | null }> = [
  { key: 'all', label: '전체', statuses: null },
  { key: 'New', label: '신규', statuses: ['New'] },
  { key: 'Ordered', label: '발주확인', statuses: ['Ordered'] },
  { key: 'shipping', label: '배송', statuses: ['Dispatched', 'Delivering'] },
  { key: 'done', label: '완료', statuses: ['Delivered', 'Confirmed'] },
  {
    key: 'claims',
    label: '클레임',
    statuses: [
      'CancelRequested', 'Cancelled',
      'ReturnRequested', 'Returned',
      'ExchangeRequested', 'Exchanged',
    ],
  },
]

export function OrdersClientV2({ initialItems }: { initialItems: OrderItemView[] }) {
  const router = useRouter()
  const { accounts, filter } = useMarketFilter()
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  const [claimTarget, setClaimTarget] = useState<OrderItemView | null>(null)
  const [claimAction, setClaimAction] = useState<ClaimAction | null>(null)
  const [isProcessingClaim, setIsProcessingClaim] = useState(false)

  const filtered = useMemo(() => {
    const accountId = filterToAccountId(filter)
    const tab = STATUS_TABS.find((t) => t.key === statusTab)
    return initialItems.filter((item) => {
      if (accountId && item.marketAccountId !== accountId) return false
      if (tab?.statuses && !tab.statuses.includes(item.status)) return false
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        item.productName.toLowerCase().includes(query) ||
        item.receiverName?.toLowerCase().includes(query) ||
        item.ordererName?.toLowerCase().includes(query) ||
        item.marketOrderRef.toLowerCase().includes(query) ||
        item.trackingNumber?.toLowerCase().includes(query)
      )
    })
  }, [initialItems, filter, statusTab, searchQuery])

  const tabCounts = useMemo(() => {
    const accountId = filterToAccountId(filter)
    const scoped = accountId
      ? initialItems.filter((item) => item.marketAccountId === accountId)
      : initialItems
    const counts = new Map<StatusTab, number>()
    for (const tab of STATUS_TABS) {
      counts.set(
        tab.key,
        tab.statuses === null
          ? scoped.length
          : scoped.filter((item) => tab.statuses!.includes(item.status)).length
      )
    }
    return counts
  }, [initialItems, filter])

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
        const result = await syncOrdersFromMarket(account.id, 7)
        if (result.success) {
          toast.success(`${account.name}: ${result.syncedCount}건 동기화`)
        } else {
          toast.error(`${account.name}: ${result.error}`)
        }
      }
      router.refresh()
    } finally {
      setIsSyncing(false)
    }
  }

  const openClaim = (item: OrderItemView, action: ClaimAction) => {
    setClaimTarget(item)
    setClaimAction(action)
  }

  const handleClaimConfirm = async (reason?: string) => {
    if (!claimTarget || !claimAction) return
    setIsProcessingClaim(true)
    try {
      const result = await processOrderClaim({
        orderItemId: claimTarget.id,
        action: claimAction,
        reason,
      })
      if (result.success) {
        toast.success(`${CLAIM_LABELS[claimAction]} 처리가 완료되었습니다.`)
        setClaimTarget(null)
        setClaimAction(null)
        router.refresh()
      } else {
        toast.error(result.error || '처리에 실패했습니다.')
      }
    } finally {
      setIsProcessingClaim(false)
    }
  }

  return (
    <>
      <Header title="주문 목록" subtitle="Orders" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <MarketFilterChips />
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="상품명, 수취인, 주문번호, 송장 검색"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={cn('h-4 w-4 lg:mr-1.5', isSyncing && 'animate-spin')} />
              <span className="hidden lg:inline">주문 동기화</span>
            </Button>
          </div>
        </div>

        <div className="mb-4 flex gap-1.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusTab(tab.key)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                statusTab === tab.key
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {tab.label}
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {tabCounts.get(tab.key) || 0}
              </Badge>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ShoppingCart className="mx-auto mb-3 h-10 w-10" />
            <p className="mb-1 font-medium">표시할 주문이 없습니다</p>
            <p className="text-sm">
              {initialItems.length === 0
                ? '주문 동기화를 실행하면 마켓의 주문을 가져옵니다.'
                : '필터를 조정해보세요.'}
            </p>
          </div>
        ) : (
          <Card className="py-0 max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
            <ResponsiveTable>
              <OrderItemsTable items={filtered} onClaim={openClaim} claimLabels={CLAIM_LABELS} />
            </ResponsiveTable>
          </Card>
        )}
      </div>

      <ClaimActionDialog
        open={claimTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClaimTarget(null)
            setClaimAction(null)
          }
        }}
        action={claimAction}
        productName={claimTarget?.productName || ''}
        isProcessing={isProcessingClaim}
        onConfirm={handleClaimConfirm}
      />
    </>
  )
}

export { ORDER_STATUS_LABELS }
