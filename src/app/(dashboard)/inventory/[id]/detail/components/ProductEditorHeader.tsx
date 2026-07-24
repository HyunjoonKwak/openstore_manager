'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RefreshCw, Upload, Loader2, Sparkles, AlertTriangle, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'

interface ProductEditorHeaderProps {
  productData: NaverProductFullDetail
  productId: string
  hasChanges: boolean
  isSyncing: boolean
  isUploading: boolean
  showUploadDialog: boolean
  setShowUploadDialog: (open: boolean) => void
  loadProductDetail: () => void
  handleUpload: () => void
  formatCurrency: (value: number) => string
}

export function ProductEditorHeader({
  productData,
  productId,
  hasChanges,
  isSyncing,
  isUploading,
  showUploadDialog,
  setShowUploadDialog,
  loadProductDetail,
  handleUpload,
  formatCurrency,
}: ProductEditorHeaderProps) {
  const router = useRouter()

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          {productData.representativeImageUrl ? (
            <Image
              src={productData.representativeImageUrl}
              alt={productData.name}
              width={60}
              height={60}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold">{productData.name}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{formatCurrency(productData.salePrice)}</span>
              <span>재고: {productData.stockQuantity}개</span>
              {productData.categoryName && (
                <Badge variant="outline" className="text-xs">
                  {productData.categoryName.split('>').pop()?.trim()}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              변경됨
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadProductDetail} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/benchmarking?view=ai&productId=${productId}`)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI 생성
          </Button>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={isUploading || !hasChanges}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                스마트스토어 업로드
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>상품 정보 업로드</DialogTitle>
                <DialogDescription>
                  수정된 상품 정보를 네이버 스마트스토어에 업로드합니다. 실제 상품 페이지가 변경됩니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>취소</Button>
                <Button onClick={() => { handleUpload(); setShowUploadDialog(false); }}>업로드</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
