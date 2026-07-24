'use client'

import { RefreshCw, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductWithSupplier } from '@/lib/actions/products'

interface CopyProductDialogProps {
  copyDialogOpen: boolean
  setCopyDialogOpen: (open: boolean) => void
  copyTargetProduct: ProductWithSupplier | null
  copyTargetStoreId: string
  setCopyTargetStoreId: (value: string) => void
  stores: { id: string; storeName: string }[]
  isCopying: boolean
  handleCopyProduct: () => void
}

export function CopyProductDialog({
  copyDialogOpen,
  setCopyDialogOpen,
  copyTargetProduct,
  copyTargetStoreId,
  setCopyTargetStoreId,
  stores,
  isCopying,
  handleCopyProduct,
}: CopyProductDialogProps) {
  return (
    <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>다른 스토어로 상품 복사</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="font-medium">{copyTargetProduct?.name}</p>
            <p className="text-sm text-muted-foreground">
              {copyTargetProduct?.brand && `${copyTargetProduct.brand} · `}
              {(copyTargetProduct?.price || 0).toLocaleString()}원
            </p>
          </div>
          <div className="space-y-2">
            <Label>복사할 스토어</Label>
            <Select value={copyTargetStoreId} onValueChange={setCopyTargetStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="스토어 선택" />
              </SelectTrigger>
              <SelectContent>
                {stores.filter(s => s.id !== copyTargetProduct?.storeId).map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            * SKU는 자동으로 _copy 접미사가 붙습니다.
            <br />
            * 복사된 상품은 로컬에만 저장되며, 네이버에 업로드하려면 별도로 진행해야 합니다.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleCopyProduct} disabled={isCopying || !copyTargetStoreId}>
            {isCopying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                복사 중...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                복사
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
