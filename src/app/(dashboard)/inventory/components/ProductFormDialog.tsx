'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, FileText, Check, X, Pencil, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { SupplierWithStats } from '@/lib/actions/suppliers'

export interface ProductFormData {
  name: string
  price: string
  stockQuantity: string
  sku: string
  supplierId: string
  storeId: string
  imageUrl: string
  category: string
  brand: string
  description: string
}

interface ProductFormDialogProps {
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingProduct: ProductWithSupplier | null
  formData: ProductFormData
  setFormData: Dispatch<SetStateAction<ProductFormData>>
  addMode: 'manual' | 'ai'
  setAddMode: (mode: 'manual' | 'ai') => void
  aiKeywords: string
  setAiKeywords: (value: string) => void
  aiCategory: string
  setAiCategory: (value: string) => void
  aiTone: string
  setAiTone: (value: string) => void
  isGenerating: boolean
  aiGenerated: { title: string; features: string[]; description: string } | null
  isPending: boolean
  suppliers: SupplierWithStats[]
  stores: { id: string; storeName: string }[]
  handleOpenDialog: (product?: ProductWithSupplier) => void
  handleAiGenerate: () => void
  handleApplyAiContent: () => void
  handleSave: () => void
}

export function ProductFormDialog({
  isDialogOpen,
  setIsDialogOpen,
  editingProduct,
  formData,
  setFormData,
  addMode,
  setAddMode,
  aiKeywords,
  setAiKeywords,
  aiCategory,
  setAiCategory,
  aiTone,
  setAiTone,
  isGenerating,
  aiGenerated,
  isPending,
  suppliers,
  stores,
  handleOpenDialog,
  handleAiGenerate,
  handleApplyAiContent,
  handleSave,
}: ProductFormDialogProps) {
  const router = useRouter()

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          상품 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? '상품 수정' : '새 상품 추가'}
          </DialogTitle>
        </DialogHeader>

        {!editingProduct && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={addMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('manual')}
              className="flex-1"
            >
              <Pencil className="h-4 w-4 mr-2" />
              수동 등록
            </Button>
            <Button
              variant={addMode === 'ai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('ai')}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI 생성 등록
            </Button>
          </div>
        )}

        {addMode === 'ai' && !editingProduct ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상품 키워드</Label>
              <Input
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="예: 무선 블루투스 이어폰, 노이즈캔슬링"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select value={aiCategory} onValueChange={setAiCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">전자제품</SelectItem>
                    <SelectItem value="fashion">패션</SelectItem>
                    <SelectItem value="home">홈/리빙</SelectItem>
                    <SelectItem value="beauty">뷰티</SelectItem>
                    <SelectItem value="food">식품</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>톤 & 스타일</Label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적</SelectItem>
                    <SelectItem value="friendly">친근한</SelectItem>
                    <SelectItem value="luxury">럭셔리</SelectItem>
                    <SelectItem value="casual">캐주얼</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAiGenerate}
              disabled={isGenerating || !aiKeywords.trim()}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'AI 생성 중...' : 'AI로 상품정보 생성'}
            </Button>

            {aiGenerated && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">생성된 상품명</Label>
                  <p className="font-medium">{aiGenerated.title}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">핵심 특징</Label>
                  <ul className="text-sm space-y-1">
                    {aiGenerated.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">상품 설명</Label>
                  <p className="text-sm text-muted-foreground">{aiGenerated.description}</p>
                </div>
                <Button className="w-full" onClick={handleApplyAiContent}>
                  <Check className="h-4 w-4 mr-2" />
                  이 내용으로 상품 등록하기
                </Button>
              </div>
            )}
          </div>
        ) : (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">기본정보</TabsTrigger>
            <TabsTrigger value="detail">상세정보</TabsTrigger>
            <TabsTrigger value="etc">기타</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] pr-4">
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="상품명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">가격 *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">재고 수량</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="상품 고유 코드"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">브랜드</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    placeholder="브랜드명"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="예: 패션 > 의류 > 상의"
                />
              </div>
            </TabsContent>

            <TabsContent value="detail" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">대표 이미지 URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
                {formData.imageUrl && (
                  <div className="mt-2 flex items-center gap-4">
                    <Image
                      src={formData.imageUrl}
                      alt="미리보기"
                      width={80}
                      height={80}
                      className="rounded-lg object-cover border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                    >
                      <X className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">상품 설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="상품에 대한 간단한 설명..."
                  className="min-h-[150px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="etc" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">공급업체</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, supplierId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="공급업체 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {stores.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="store">스토어</Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, storeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="스토어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.storeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingProduct?.platformProductId && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">네이버 연동 정보</p>
                  <p className="text-xs text-muted-foreground">
                    이 상품은 네이버 스마트스토어와 연동되어 있습니다.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDialogOpen(false)
                      router.push(`/inventory/${editingProduct.id}/detail`)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    상세페이지 편집
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        )}

        {(addMode === 'manual' || editingProduct) && (
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? '저장 중...' : editingProduct ? '수정' : '추가'}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
