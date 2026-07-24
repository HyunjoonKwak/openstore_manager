'use client'

import { Columns, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TabsContent } from '@/components/ui/tabs'
import type { BenchmarkPage } from '@/types/database.types'

interface PageListPanelProps {
  pages: BenchmarkPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  editingPageId: string | null
  editingPageTitle: string
  onEditingPageTitleChange: (value: string) => void
  onStartEditPage: (page: BenchmarkPage) => void
  onSavePageTitle: (pageId: string) => void
  onCancelEditPage: () => void
  onOpenAddPage: () => void
  onRequestDeletePage: (page: BenchmarkPage) => void
  isPending: boolean
}

export function PageListPanel({
  pages,
  selectedPageId,
  onSelectPage,
  editingPageId,
  editingPageTitle,
  onEditingPageTitleChange,
  onStartEditPage,
  onSavePageTitle,
  onCancelEditPage,
  onOpenAddPage,
  onRequestDeletePage,
  isPending,
}: PageListPanelProps) {
  return (
    <TabsContent value="pages" className="flex-1 m-0 overflow-hidden flex flex-col">
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onOpenAddPage()}
        >
          <Plus className="h-3 w-3 mr-1" />
          페이지 추가
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Columns className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>저장된 페이지가 없습니다</p>
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className={`p-2 rounded-md border ${
                  page.id === selectedPageId ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                }`}
              >
                {editingPageId === page.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingPageTitle}
                      onChange={(e) => onEditingPageTitleChange(e.target.value)}
                      placeholder="페이지 이름"
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSavePageTitle(page.id)
                        if (e.key === 'Escape') onCancelEditPage()
                      }}
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-6 text-xs flex-1"
                        onClick={() => onSavePageTitle(page.id)}
                        disabled={isPending}
                      >
                        저장
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={onCancelEditPage}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="cursor-pointer"
                      onClick={() => onSelectPage(page.id)}
                    >
                      <p className="text-sm font-medium break-words">
                        {page.title || new URL(page.url).hostname}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">{page.url}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartEditPage(page)
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        편집
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(page.url, '_blank')
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRequestDeletePage(page)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}
