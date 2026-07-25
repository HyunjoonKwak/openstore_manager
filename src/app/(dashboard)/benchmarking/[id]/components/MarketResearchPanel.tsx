'use client'
/* eslint-disable @next/next/no-img-element -- 벤치마킹 대상의 임의 원격 이미지를 비교합니다. */

import { ExternalLink, Loader2, Search, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TabsContent } from '@/components/ui/tabs'
import type { BenchmarkPage } from '@/types/database.types'

export interface MarketProduct {
  product_id: string
  title: string
  price: number
  mall_name: string
  url: string
  image_url?: string
  brand?: string
  review_count?: number
  purchase_count?: number
}

interface MarketResearchPanelProps {
  marketQuery: string
  onMarketQueryChange: (value: string) => void
  onSearch: () => Promise<void>
  isMarketLoading: boolean
  marketMessage: string
  marketProducts: MarketProduct[]
  pages: BenchmarkPage[]
  isPending: boolean
  onAddProduct: (product: MarketProduct) => void
}

export function MarketResearchPanel({
  marketQuery,
  onMarketQueryChange,
  onSearch,
  isMarketLoading,
  marketMessage,
  marketProducts,
  pages,
  isPending,
  onAddProduct,
}: MarketResearchPanelProps) {
  return (
    <TabsContent value="research" className="flex-1 m-0 overflow-hidden flex flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="flex gap-2">
          <Input
            value={marketQuery}
            onChange={(event) => onMarketQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onSearch()
            }}
            placeholder="예: 휴대용 선풍기"
            className="h-9 text-sm sm:h-8"
          />
          <Button
            size="sm"
            className="h-9 px-3 sm:h-8"
            onClick={() => void onSearch()}
            disabled={isMarketLoading}
          >
            {isMarketLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{marketMessage}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {marketProducts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto mb-2 h-9 w-9 opacity-30" />
              <p className="text-sm">검색 결과가 여기에 표시됩니다</p>
              <p className="mt-1 text-xs">상위 상품을 골라 비교 페이지로 추가하세요</p>
            </div>
          ) : (
            marketProducts.map((product, index) => {
              const cleanTitle = product.title.replace(/<[^>]+>/g, '')
              const isAdded = pages.some((page) => page.url === product.url || page.url === product.url?.split('?')[0])
              return (
                <div key={`${product.product_id}-${index}`} className="rounded-lg border bg-card p-2.5">
                  <div className="flex gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    {product.image_url && (
                      <img src={product.image_url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed">{cleanTitle}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {product.mall_name} · {Number(product.price || 0).toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {product.url && product.url !== '#' && (
                      <Button variant="ghost" size="sm" className="h-9 text-xs sm:h-7" onClick={() => window.open(product.url, '_blank')}>
                        <ExternalLink className="mr-1 h-3 w-3" /> 보기
                      </Button>
                    )}
                    <Button
                      variant={isAdded ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-9 text-xs sm:h-7"
                      disabled={isAdded || isPending}
                      onClick={() => onAddProduct(product)}
                    >
                      {isAdded ? '추가됨' : '비교에 추가'}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}
