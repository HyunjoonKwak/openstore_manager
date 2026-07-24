'use client'
/* eslint-disable @next/next/no-img-element -- 벤치마킹 대상의 임의 원격 이미지를 비교합니다. */

import { Download, ExternalLink, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TabsContent } from '@/components/ui/tabs'
import type { BenchmarkAsset } from '@/types/database.types'

interface AssetPanelProps {
  assets: BenchmarkAsset[]
  newAssetUrl: string
  onNewAssetUrlChange: (value: string) => void
  newAssetMemo: string
  onNewAssetMemoChange: (value: string) => void
  onAdd: () => void
  onDelete: (item: BenchmarkAsset) => void
  onDownloadAll: () => Promise<void>
  isPending: boolean
}

export function AssetPanel({
  assets,
  newAssetUrl,
  onNewAssetUrlChange,
  newAssetMemo,
  onNewAssetMemoChange,
  onAdd,
  onDelete,
  onDownloadAll,
  isPending,
}: AssetPanelProps) {
  return (
    <TabsContent value="assets" className="flex-1 m-0 overflow-hidden flex flex-col">
      <div className="p-3 border-b space-y-2">
        <Input
          placeholder="이미지 URL 입력..."
          value={newAssetUrl}
          onChange={(e) => onNewAssetUrlChange(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="메모 (선택)"
          value={newAssetMemo}
          onChange={(e) => onNewAssetMemoChange(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onAdd}
            disabled={isPending || !newAssetUrl.trim()}
          >
            <Plus className="h-3 w-3 mr-1" />
            이미지 추가
          </Button>
          {assets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onDownloadAll}
            >
              <Download className="h-3 w-3 mr-1" />
              전체
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 grid grid-cols-2 gap-2">
          {assets.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>저장된 이미지가 없습니다</p>
              <p className="text-xs mt-1">경쟁사 이미지 URL을 저장해보세요</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="relative group rounded-md overflow-hidden border bg-muted/30"
              >
                {asset.url && (
                  <img
                    src={asset.url}
                    alt={asset.memo || '저장된 이미지'}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => asset.url && window.open(asset.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => onDelete(asset)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {asset.memo && (
                  <div className="p-1.5 text-[10px] truncate text-muted-foreground">
                    {asset.memo}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}
