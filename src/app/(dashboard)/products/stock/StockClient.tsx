'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, Check, Package, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { setStock } from '@/lib/actions/master-products'
import { pushStockToMarket } from '@/lib/actions/market-sync'
import type { MasterProductWithListings } from '@/lib/actions/master-products'

// Stock screen — one of the four mobile-supported flows. Card list on
// phones with numeric-keypad editing; desktop adds the market push.

type StockFilter = 'all' | 'low' | 'out'

export function StockClient({ initialProducts }: { initialProducts: MasterProductWithListings[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<StockFilter>('low')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isPushing, setIsPushing] = useState(false)

  const filtered = useMemo(
    () =>
      initialProducts.filter((product) => {
        if (filter === 'low' && product.stockQuantity > 10) return false
        if (filter === 'out' && product.stockQuantity !== 0) return false
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
          product.name.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query)
        )
      }),
    [initialProducts, filter, searchQuery]
  )

  const outCount = initialProducts.filter((p) => p.stockQuantity === 0).length
  const lowCount = initialProducts.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).length

  const startEdit = (product: MasterProductWithListings) => {
    setEditingId(product.id)
    setEditingValue(String(product.stockQuantity))
  }

  const saveEdit = async () => {
    if (!editingId) return
    const quantity = Number(editingValue)
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error('0 이상의 정수를 입력해주세요.')
      return
    }
    const result = await setStock({ masterProductId: editingId, stockQuantity: quantity })
    if (result.success) {
      toast.success('재고가 수정되었습니다.')
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error || '수정에 실패했습니다.')
    }
  }

  const handlePushAll = async () => {
    const listingIds = filtered
      .flatMap((product) => product.listings)
      .filter((listing) => listing.remoteRef !== null)
      .map((listing) => listing.listingId)
    if (listingIds.length === 0) {
      toast.error('마켓에 배포된 상품이 없습니다.')
      return
    }
    setIsPushing(true)
    try {
      const result = await pushStockToMarket(listingIds)
      const failCount = result.results.filter((r) => !r.success).length
      if (result.success) {
        toast.success(
          `${result.results.length - failCount}건 반영${failCount > 0 ? `, ${failCount}건 실패` : ''}`
        )
      } else {
        toast.error(result.error || '재고 반영에 실패했습니다.')
      }
    } finally {
      setIsPushing(false)
    }
  }

  const filterTabs: Array<{ key: StockFilter; label: string; count: number }> = [
    { key: 'low', label: '부족·품절', count: lowCount + outCount },
    { key: 'out', label: '품절만', count: outCount },
    { key: 'all', label: '전체', count: initialProducts.length },
  ]

  return (
    <>
      <Header title="재고" subtitle="Stock" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  filter === tab.key
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {tab.label}
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="상품명, SKU 검색"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Market push is a desktop action */}
            <Button
              variant="outline"
              className="hidden lg:inline-flex"
              onClick={handlePushAll}
              disabled={isPushing}
            >
              <ArrowUpRight className={cn('mr-1.5 h-4 w-4', isPushing && 'animate-pulse')} />
              재고 → 마켓 반영
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-10 w-10" />
            <p>표시할 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((product) => {
              const isEditing = editingId === product.id
              return (
                <Card key={product.id} className="py-0">
                  <CardContent className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {product.sku && <span>{product.sku}</span>}
                        {product.stockQuantity === 0 ? (
                          <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                            품절
                          </Badge>
                        ) : product.stockQuantity <= 10 ? (
                          <Badge
                            variant="outline"
                            className="h-4 border-warning/20 bg-warning/10 px-1.5 text-[10px] text-warning"
                          >
                            <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                            부족
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="h-10 w-24 text-right text-base tabular-nums"
                          autoFocus
                        />
                        <Button size="icon" className="h-10 w-10" onClick={saveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="min-h-11 min-w-16 rounded-lg px-3 text-right text-lg font-semibold tabular-nums hover:bg-accent"
                      >
                        {product.stockQuantity.toLocaleString()}
                      </button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
