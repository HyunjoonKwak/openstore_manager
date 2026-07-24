'use client'

import { Columns, ExternalLink, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BenchmarkPage } from '@/types/database.types'

const zoomOptions = [50, 75, 100]

const getPlatformLabel = (platform: string): string => {
  const labels: Record<string, string> = {
    naver_smartstore: '스마트스토어',
    naver_brand: '브랜드스토어',
    coupang: '쿠팡',
    gmarket: 'G마켓',
    '11st': '11번가',
  }
  return labels[platform] || '기타'
}

interface ComparePagePaneProps {
  pages: BenchmarkPage[]
  selectedPage: BenchmarkPage | undefined
  selectedPageId: string | null
  comparePageZoom: number
  onZoomChange: (zoom: number) => void
  onSelectPage: (pageId: string) => void
  onOpenAddPage: () => void
}

export function ComparePagePane({
  pages,
  selectedPage,
  selectedPageId,
  comparePageZoom,
  onZoomChange,
  onSelectPage,
  onOpenAddPage,
}: ComparePagePaneProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium shrink-0">비교 페이지</span>
          {selectedPage && (
            <>
              <Badge variant="outline" className="text-xs shrink-0">
                {getPlatformLabel(selectedPage.platform)}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">
                {selectedPage.title || new URL(selectedPage.url).hostname}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => window.open(selectedPage.url, '_blank')}
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
                variant={comparePageZoom === zoom ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => onZoomChange(zoom)}
              >
                {zoom}%
              </Button>
            ))}
          </div>
          {pages.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Columns className="h-3 w-3 mr-1" />
                  페이지 선택
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {pages.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    onClick={() => onSelectPage(page.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate flex-1">
                      {page.title || new URL(page.url).hostname}
                    </span>
                    {page.id === selectedPageId && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        선택됨
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onOpenAddPage()}
          >
            <Plus className="h-3 w-3 mr-1" />
            추가
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-muted/20 overflow-hidden">
        {selectedPage ? (
          <div
            className="origin-top-left"
            style={{
              width: `${100 / (comparePageZoom / 100)}%`,
              height: `${100 / (comparePageZoom / 100)}%`,
              transform: `scale(${comparePageZoom / 100})`,
            }}
          >
            <iframe
              src={selectedPage.url}
              className="w-full h-full border-0"
              title="비교 페이지"
              sandbox="allow-scripts allow-popups"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Plus className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              비교할 경쟁사 페이지를 추가해주세요
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenAddPage()}>
              페이지 추가하기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
