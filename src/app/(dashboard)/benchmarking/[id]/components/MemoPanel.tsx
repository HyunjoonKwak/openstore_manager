'use client'

import { Plus, StickyNote, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { BenchmarkMemo } from '@/types/database.types'

const memoColors = [
  { value: 'yellow', label: '노랑', className: 'bg-yellow-200' },
  { value: 'blue', label: '파랑', className: 'bg-blue-200' },
  { value: 'green', label: '초록', className: 'bg-green-200' },
  { value: 'pink', label: '분홍', className: 'bg-pink-200' },
  { value: 'purple', label: '보라', className: 'bg-purple-200' },
]

const getMemoColorClass = (color: string) => {
  return memoColors.find((c) => c.value === color)?.className || 'bg-yellow-200'
}

interface MemoPanelProps {
  memos: BenchmarkMemo[]
  newMemoContent: string
  onNewMemoContentChange: (value: string) => void
  newMemoColor: string
  onNewMemoColorChange: (value: string) => void
  onAdd: () => void
  onDelete: (item: BenchmarkMemo) => void
  isPending: boolean
}

export function MemoPanel({
  memos,
  newMemoContent,
  onNewMemoContentChange,
  newMemoColor,
  onNewMemoColorChange,
  onAdd,
  onDelete,
  isPending,
}: MemoPanelProps) {
  return (
    <TabsContent value="memos" className="flex-1 m-0 overflow-hidden flex flex-col">
      <div className="p-3 border-b space-y-2">
        <Textarea
          placeholder="메모를 입력하세요..."
          value={newMemoContent}
          onChange={(e) => onNewMemoContentChange(e.target.value)}
          className="min-h-[60px] text-sm resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {memoColors.map((color) => (
              <button
                key={color.value}
                className={`w-5 h-5 rounded-full border-2 ${color.className} ${
                  newMemoColor === color.value ? 'border-foreground' : 'border-transparent'
                }`}
                onClick={() => onNewMemoColorChange(color.value)}
                title={color.label}
              />
            ))}
          </div>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={onAdd}
            disabled={isPending || !newMemoContent.trim()}
          >
            <Plus className="h-3 w-3 mr-1" />
            추가
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {memos.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>아직 메모가 없습니다</p>
              <p className="text-xs mt-1">비교하면서 메모를 남겨보세요</p>
            </div>
          ) : (
            memos.map((memo) => (
              <div
                key={memo.id}
                className={`p-3 rounded-md group ${getMemoColorClass(memo.color)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1 whitespace-pre-wrap">{memo.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => onDelete(memo)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(memo.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}
