'use client'

import { ExternalLink, Link as LinkIcon, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ProductForBenchmark } from '@/lib/actions/benchmark'

const zoomOptions = [50, 75, 100]

interface MyPagePaneProps {
  myPageUrl: string | null
  selectedProduct: ProductForBenchmark | undefined
  myPageZoom: number
  onZoomChange: (zoom: number) => void
  onOpenSelectProduct: () => void
}

export function MyPagePane({
  myPageUrl,
  selectedProduct,
  myPageZoom,
  onZoomChange,
  onOpenSelectProduct,
}: MyPagePaneProps) {
  return (
    <div className="flex-1 flex flex-col border-r border-border min-w-0">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium shrink-0">내 상품</span>
          {selectedProduct && (
            <>
              <span className="text-xs text-muted-foreground truncate">
                {selectedProduct.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => window.open(myPageUrl!, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center border rounded-md">
            {zoomOptions.map((zoom) => (
              <Button
                key={zoom}
                variant={myPageZoom === zoom ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => onZoomChange(zoom)}
              >
                {zoom}%
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onOpenSelectProduct()}
          >
            <Pencil className="h-3 w-3 mr-1" />
            {selectedProduct ? '변경' : '상품 선택'}
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-muted/20 relative overflow-hidden">
        {myPageUrl ? (
          <div
            className="origin-top-left"
            style={{
              width: `${100 / (myPageZoom / 100)}%`,
              height: `${100 / (myPageZoom / 100)}%`,
              transform: `scale(${myPageZoom / 100})`,
            }}
          >
            <iframe
              src={myPageUrl}
              className="w-full h-full border-0"
              title="내 페이지"
              sandbox="allow-scripts allow-popups"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <LinkIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              재고관리에서 연동된 내 상품을 선택해주세요
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenSelectProduct()}>
              상품 선택하기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
