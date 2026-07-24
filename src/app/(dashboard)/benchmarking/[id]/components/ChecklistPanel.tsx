'use client'

import { CheckSquare, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TabsContent } from '@/components/ui/tabs'
import type { BenchmarkChecklist } from '@/types/database.types'

interface ChecklistPanelProps {
  checklists: BenchmarkChecklist[]
  newChecklistContent: string
  onNewChecklistContentChange: (value: string) => void
  onAdd: () => void
  onToggle: (item: BenchmarkChecklist) => void
  onDelete: (item: BenchmarkChecklist) => void
  isPending: boolean
}

export function ChecklistPanel({
  checklists,
  newChecklistContent,
  onNewChecklistContentChange,
  onAdd,
  onToggle,
  onDelete,
  isPending,
}: ChecklistPanelProps) {
  return (
    <TabsContent value="checklist" className="flex-1 m-0 overflow-hidden flex flex-col">
      <div className="p-3 border-b">
        <div className="flex gap-2">
          <Input
            placeholder="개선할 점을 입력하세요..."
            value={newChecklistContent}
            onChange={(e) => onNewChecklistContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onAdd()
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            onClick={onAdd}
            disabled={isPending || !newChecklistContent.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {checklists.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>아직 체크리스트가 없습니다</p>
              <p className="text-xs mt-1">개선점을 추가해보세요</p>
            </div>
          ) : (
            checklists.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 group"
              >
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={() => onToggle(item)}
                  className="mt-0.5"
                />
                <span
                  className={`flex-1 text-sm ${
                    item.is_completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {item.content}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(item)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}
