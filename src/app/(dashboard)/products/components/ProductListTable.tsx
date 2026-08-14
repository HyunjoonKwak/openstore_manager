'use client'

import Image from 'next/image'
import { Package } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { PLATFORM_LABELS } from '@/lib/markets/labels'
import type { MarketAccountInfo } from '@/lib/actions/market-accounts'
import type { MasterProductWithListings } from '@/lib/actions/master-products'
import type { ValidationIssue } from '@/lib/markets/types'
import { MarketCell } from './MarketCell'

// Dense desktop list: 40px rows, 13px text, one column per market
// account. Row click focuses the detail panel; checkbox drives bulk.

function formatWon(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`
}

export interface ReadinessMap {
  /** accountId → productId → issues */
  byAccount: Map<string, Map<string, ValidationIssue[]>>
}

export function ProductListTable({
  products,
  accounts,
  readiness,
  selectedIds,
  focusedIndex,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
}: {
  products: MasterProductWithListings[]
  accounts: MarketAccountInfo[]
  readiness: ReadinessMap
  selectedIds: Set<string>
  focusedIndex: number
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onRowClick: (index: number) => void
}) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
          </TableHead>
          <TableHead className="w-11 whitespace-nowrap text-xs font-semibold uppercase" />
          <TableHead className="min-w-52 whitespace-nowrap text-xs font-semibold uppercase">
            상품
          </TableHead>
          <TableHead className="whitespace-nowrap text-xs font-semibold uppercase">공급처</TableHead>
          <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">
            원가
          </TableHead>
          <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase">
            기준가
          </TableHead>
          <TableHead className="whitespace-nowrap text-center text-xs font-semibold uppercase">
            재고
          </TableHead>
          {accounts.map((account) => (
            <TableHead
              key={account.id}
              className="min-w-36 whitespace-nowrap text-xs font-semibold uppercase"
            >
              {account.name || PLATFORM_LABELS[account.platform]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product, index) => {
          const focused = index === focusedIndex
          return (
            <TableRow
              key={product.id}
              data-row-index={index}
              onClick={() => onRowClick(index)}
              className={cn(
                'h-10 cursor-pointer text-[13px]',
                focused && 'bg-primary/10 hover:bg-primary/10'
              )}
            >
              <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => onToggleSelect(product.id)}
                />
              </TableCell>
              <TableCell className="py-1.5">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="py-1.5">
                <p className="line-clamp-1 font-medium">{product.name}</p>
                {product.sku && (
                  <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1.5 text-muted-foreground">
                {product.supplierName || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1.5 text-right tabular-nums text-muted-foreground">
                {product.costPrice !== null ? formatWon(product.costPrice) : '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1.5 text-right font-medium tabular-nums">
                {formatWon(product.basePrice)}
              </TableCell>
              <TableCell
                className={cn(
                  'whitespace-nowrap py-1.5 text-center tabular-nums',
                  product.stockQuantity === 0 && 'font-medium text-destructive',
                  product.stockQuantity > 0 && product.stockQuantity <= 10 && 'text-warning'
                )}
              >
                {product.stockQuantity.toLocaleString()}
              </TableCell>
              {accounts.map((account) => {
                const listing =
                  product.listings.find((l) => l.marketAccountId === account.id) || null
                const issues =
                  readiness.byAccount.get(account.id)?.get(product.id) || []
                return (
                  <TableCell key={account.id} className="py-1.5">
                    <MarketCell listing={listing} basePrice={product.basePrice} issues={issues} />
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
