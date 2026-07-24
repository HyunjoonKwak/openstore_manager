'use client'
/* eslint-disable @next/next/no-img-element -- 벤치마킹 대상의 임의 원격 이미지를 비교합니다. */

import { Image as ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductForBenchmark } from '@/lib/actions/benchmark'

interface SelectProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ProductForBenchmark[]
  productSearchQuery: string
  onProductSearchQueryChange: (value: string) => void
  myProductId: string | null
  onSelectProduct: (product: ProductForBenchmark) => void
}

export function SelectProductDialog({
  open,
  onOpenChange,
  products,
  productSearchQuery,
  onProductSearchQueryChange,
  myProductId,
  onSelectProduct,
}: SelectProductDialogProps) {
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.storeName.toLowerCase().includes(productSearchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>내 상품 선택</DialogTitle>
          <DialogDescription>
            비교할 내 상품을 선택하세요. 네이버 연동된 상품만 표시됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            placeholder="상품명 검색..."
            value={productSearchQuery}
            onChange={(e) => onProductSearchQueryChange(e.target.value)}
            className="h-9"
          />
          <ScrollArea className="h-[300px] border rounded-md">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                <p className="text-sm">연동된 상품이 없습니다</p>
                <p className="text-xs mt-1">재고관리에서 네이버 상품을 먼저 동기화해주세요</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                      myProductId === product.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => onSelectProduct(product)}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.storeName}</p>
                    </div>
                    {myProductId === product.id && (
                      <Badge variant="secondary" className="text-xs">선택됨</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
