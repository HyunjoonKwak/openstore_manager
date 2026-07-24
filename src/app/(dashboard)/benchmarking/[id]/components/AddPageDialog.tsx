'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AddPageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newPageUrl: string
  onNewPageUrlChange: (value: string) => void
  newPageTitle: string
  onNewPageTitleChange: (value: string) => void
  onSubmit: () => void
  isPending: boolean
}

export function AddPageDialog({
  open,
  onOpenChange,
  newPageUrl,
  onNewPageUrlChange,
  newPageTitle,
  onNewPageTitleChange,
  onSubmit,
  isPending,
}: AddPageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>비교 페이지 추가</DialogTitle>
          <DialogDescription>
            비교하고 싶은 경쟁사 페이지 URL을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pageUrl">페이지 URL *</Label>
            <Input
              id="pageUrl"
              type="url"
              placeholder="https://smartstore.naver.com/..."
              value={newPageUrl}
              onChange={(e) => onNewPageUrlChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pageTitle">이름 (선택)</Label>
            <Input
              id="pageTitle"
              placeholder="예: 경쟁사A 롱패딩"
              value={newPageTitle}
              onChange={(e) => onNewPageTitleChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? '추가 중...' : '추가하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
