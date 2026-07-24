'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertTriangle, Search, RefreshCw, Upload, FileSpreadsheet, ShoppingBag, Ban, ArrowUpRight } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductWithSupplier,
} from '@/lib/actions/products'
import { syncNaverProducts, syncAllStockToNaver } from '@/lib/actions/naver-sync'
import { uploadProductsFromExcel, generateProductTemplate } from '@/lib/actions/excel-upload'
import { copyProductToStore } from '@/lib/actions/store-management'
import type { SupplierWithStats } from '@/lib/actions/suppliers'
import { cn } from '@/lib/utils'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { ProductFormDialog } from './components/ProductFormDialog'
import { ProductTable } from './components/ProductTable'
import { CopyProductDialog } from './components/CopyProductDialog'

interface InventoryClientProps {
  initialProducts: ProductWithSupplier[]
  initialStats: {
    totalProducts: number
    lowStock: number
    outOfStock: number
    healthy: number
  }
  suppliers: SupplierWithStats[]
  stores: { id: string; storeName: string }[]
}

export function InventoryClient({
  initialProducts,
  initialStats,
  suppliers,
  stores,
}: InventoryClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<ProductWithSupplier[]>(initialProducts)
  const [stats, setStats] = useState(initialStats)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithSupplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('SALE')
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isStockSyncing, setIsStockSyncing] = useState(false)

  const defaultStoreId = stores[0]?.id || ''

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stockQuantity: '',
    sku: '',
    supplierId: '',
    storeId: defaultStoreId,
    imageUrl: '',
    category: '',
    brand: '',
    description: '',
  })

  const [editingCell, setEditingCell] = useState<{ id: string; field: 'price' | 'stockQuantity' } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyTargetProduct, setCopyTargetProduct] = useState<ProductWithSupplier | null>(null)
  const [copyTargetStoreId, setCopyTargetStoreId] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<ProductWithSupplier | null>(null)

  const [addMode, setAddMode] = useState<'manual' | 'ai'>('manual')
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiCategory, setAiCategory] = useState('electronics')
  const [aiTone, setAiTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiGenerated, setAiGenerated] = useState<{
    title: string
    features: string[]
    description: string
  } | null>(null)

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      stockQuantity: '',
      sku: '',
      supplierId: '',
      storeId: defaultStoreId,
      imageUrl: '',
      category: '',
      brand: '',
      description: '',
    })
    setEditingProduct(null)
    setAddMode('manual')
    setAiKeywords('')
    setAiGenerated(null)
  }

  const handleOpenDialog = (product?: ProductWithSupplier) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        price: String(product.price),
        stockQuantity: String(product.stockQuantity),
        sku: product.sku || '',
        supplierId: product.supplierId || '',
        storeId: product.storeId,
        imageUrl: product.imageUrl || '',
        category: product.category || '',
        brand: product.brand || '',
        description: '',
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleAiGenerate = async () => {
    if (!aiKeywords.trim()) {
      toast.error('키워드를 입력해주세요.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: aiKeywords,
          category: aiCategory,
          tone: aiTone,
          options: { seo: true, html: false },
        }),
      })

      if (!response.ok) {
        // Surface the server-provided error reason instead of a fixed message
        const body = await response.json().catch(() => null)
        const serverError =
          typeof body?.error === 'string'
            ? body.error
            : typeof body?.message === 'string'
              ? body.message
              : ''
        const message = serverError.includes('API key')
          ? 'API 키가 설정되지 않았습니다. 설정 페이지에서 OpenAI API 키를 입력하세요.'
          : serverError || '생성에 실패했습니다.'
        toast.error(message)
        return
      }

      const data = await response.json()
      setAiGenerated(data)
      toast.success('AI가 상품 정보를 생성했습니다!')
    } catch {
      toast.error('생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyAiContent = () => {
    if (!aiGenerated) return

    setFormData(prev => ({
      ...prev,
      name: aiGenerated.title,
      description: aiGenerated.description,
    }))
    setAddMode('manual')
    toast.success('AI 생성 내용이 적용되었습니다. 가격과 재고를 입력해주세요.')
  }

  const recalculateStats = (productList: ProductWithSupplier[]) => {
    const totalProducts = productList.length
    const outOfStock = productList.filter((p) => p.stockQuantity === 0).length
    const lowStock = productList.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).length
    const healthy = totalProducts - outOfStock - lowStock
    setStats({ totalProducts, lowStock, outOfStock, healthy })
  }

  const handleNaverSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncNaverProducts()
      if (result.success) {
        toast.success(`${result.syncedCount}개 상품이 동기화되었습니다.`)
        router.refresh()
      } else {
        toast.error(result.error || '동기화에 실패했습니다.')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStockSync = async () => {
    setIsStockSyncing(true)
    try {
      const result = await syncAllStockToNaver()
      if (result.success) {
        toast.success(`${result.syncedCount}개 상품의 재고가 스마트스토어에 반영되었습니다.`)
      } else {
        toast.error(result.error || '재고 동기화에 실패했습니다.')
      }
    } finally {
      setIsStockSyncing(false)
    }
  }

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadProductsFromExcel(formData)
      if (result.success) {
        toast.success(`${result.importedCount}개 상품이 등록되었습니다.`)
        router.refresh()
      } else {
        toast.error(result.error || '업로드에 실패했습니다.')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const base64 = await generateProductTemplate()
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '상품_템플릿.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('템플릿이 다운로드되었습니다.')
    } catch {
      toast.error('템플릿 다운로드에 실패했습니다.')
    }
  }

  const handleSave = () => {
    const errors: string[] = []

    if (!formData.name.trim()) {
      errors.push('상품명')
    }
    if (!formData.price || Number(formData.price) <= 0) {
      errors.push('가격 (0보다 큰 값)')
    }
    if (formData.stockQuantity && Number(formData.stockQuantity) < 0) {
      errors.push('재고 수량 (0 이상)')
    }

    if (errors.length > 0) {
      toast.error(`다음 항목을 확인해주세요: ${errors.join(', ')}`)
      return
    }

    if (!formData.storeId) {
      toast.error('스토어를 먼저 등록해주세요. 설정 > 스토어 관리에서 추가할 수 있습니다.')
      return
    }

    startTransition(async () => {
      if (editingProduct) {
        const result = await updateProduct({
          id: editingProduct.id,
          name: formData.name,
          price: Number(formData.price),
          stockQuantity: Number(formData.stockQuantity) || 0,
          sku: formData.sku || undefined,
          supplierId: formData.supplierId || null,
        })

        if (result.success) {
          const updatedProducts = products.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  name: formData.name,
                  price: Number(formData.price),
                  stockQuantity: Number(formData.stockQuantity) || 0,
                  sku: formData.sku || null,
                  supplierId: formData.supplierId || null,
                  supplierName: suppliers.find((s) => s.id === formData.supplierId)?.name || null,
                }
              : p
          )
          setProducts(updatedProducts)
          recalculateStats(updatedProducts)
          toast.success('상품 정보가 수정되었습니다.')
        } else {
          toast.error(result.error || '수정에 실패했습니다.')
        }
      } else {
        const result = await createProduct({
          storeId: formData.storeId,
          name: formData.name,
          price: Number(formData.price),
          stockQuantity: Number(formData.stockQuantity) || 0,
          sku: formData.sku || undefined,
          supplierId: formData.supplierId || undefined,
        })

        if (result.data) {
          const newProducts = [result.data, ...products]
          setProducts(newProducts)
          recalculateStats(newProducts)
          toast.success('새 상품이 추가되었습니다.')
        } else {
          toast.error(result.error || '추가에 실패했습니다.')
        }
      }

      setIsDialogOpen(false)
      resetForm()
    })
  }

  const handleOpenDeleteDialog = (product: ProductWithSupplier) => {
    setDeleteTargetProduct(product)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTargetProduct) return

    const result = await deleteProduct(deleteTargetProduct.id)
    if (result.success) {
      const updatedProducts = products.filter((p) => p.id !== deleteTargetProduct.id)
      setProducts(updatedProducts)
      recalculateStats(updatedProducts)
      toast.success('상품이 삭제되었습니다.')
    } else {
      toast.error(result.error || '삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
    setDeleteTargetProduct(null)
  }

  const handleOpenCopyDialog = (product: ProductWithSupplier) => {
    setCopyTargetProduct(product)
    const otherStores = stores.filter(s => s.id !== product.storeId)
    if (otherStores.length > 0) {
      setCopyTargetStoreId(otherStores[0].id)
    }
    setCopyDialogOpen(true)
  }

  const handleCopyProduct = async () => {
    if (!copyTargetProduct || !copyTargetStoreId) {
      toast.error('복사할 스토어를 선택해주세요.')
      return
    }

    setIsCopying(true)
    try {
      const result = await copyProductToStore(copyTargetProduct.id, copyTargetStoreId)
      if (result.success) {
        toast.success('상품이 복사되었습니다.')
        setCopyDialogOpen(false)
        setCopyTargetProduct(null)
        router.refresh()
      } else {
        toast.error(result.error || '복사에 실패했습니다.')
      }
    } finally {
      setIsCopying(false)
    }
  }

  const handleInlineEdit = (id: string, field: 'price' | 'stockQuantity', currentValue: number) => {
    setEditingCell({ id, field })
    setEditingValue(String(currentValue))
  }

  const handleInlineSave = async () => {
    if (!editingCell) return

    const numericValue = Number(editingValue)
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('올바른 숫자를 입력해주세요.')
      return
    }

    const result = await updateProduct({
      id: editingCell.id,
      [editingCell.field]: numericValue,
    })

    if (result.success) {
      const updatedProducts = products.map((p) =>
        p.id === editingCell.id
          ? { ...p, [editingCell.field]: numericValue }
          : p
      )
      setProducts(updatedProducts)
      if (editingCell.field === 'stockQuantity') {
        recalculateStats(updatedProducts)
      }
      toast.success('수정되었습니다.')
    } else {
      toast.error(result.error || '수정에 실패했습니다.')
    }
    setEditingCell(null)
  }

  const handleInlineCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInlineSave()
    } else if (e.key === 'Escape') {
      handleInlineCancel()
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    if (statusFilter === 'all') {
      matchesStatus = true
    } else if (statusFilter === 'lowstock') {
      matchesStatus = product.stockQuantity <= 10
    } else if (statusFilter === 'PROHIBITION') {
      matchesStatus = product.status === 'PROHIBITION' || product.status === 'SUSPENSION'
    } else {
      matchesStatus = (product.status || '') === statusFilter
    }

    return matchesSearch && matchesStatus
  })

  const statusCounts = products.reduce((acc, p) => {
    const status = p.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const saleCount = statusCounts['SALE'] || 0
  const prohibitionCount = (statusCounts['PROHIBITION'] || 0) + (statusCounts['SUSPENSION'] || 0)

  const statItems = [
    { label: '전체 상품', value: stats.totalProducts, icon: Package, color: 'text-primary', filter: 'all' },
    { label: '판매중', value: saleCount, icon: ShoppingBag, color: 'text-green-500', filter: 'SALE' },
    { label: '판매금지/중지', value: prohibitionCount, icon: Ban, color: 'text-destructive', filter: 'PROHIBITION' },
    { label: '재고부족/품절', value: stats.lowStock + stats.outOfStock, icon: AlertTriangle, color: 'text-warning', filter: 'lowstock' },
  ]

  return (
    <>
      <Header title="재고 관리" subtitle="Inventory" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleExcelUpload}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statItems.map((stat) => (
            <Card
              key={stat.label}
              className={cn(
                'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                statusFilter === stat.filter && 'ring-2 ring-primary'
              )}
              onClick={() => setStatusFilter(stat.filter)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className={cn('rounded-lg bg-muted p-2', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex flex-1 gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="상품명, SKU, 카테고리, 브랜드 검색..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="SALE">판매중</SelectItem>
                <SelectItem value="PROHIBITION">판매금지/중지</SelectItem>
                <SelectItem value="WAIT">승인대기</SelectItem>
                <SelectItem value="lowstock">재고부족/품절</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleNaverSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
              상품 동기화
            </Button>
            <Button
              variant="outline"
              onClick={handleStockSync}
              disabled={isStockSyncing}
            >
              <ArrowUpRight className={cn('h-4 w-4 mr-2', isStockSyncing && 'animate-pulse')} />
              {isStockSyncing ? '재고 동기화 중...' : '재고 → 네이버'}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? '업로드 중...' : '엑셀 업로드'}
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              템플릿 다운로드
            </Button>
            <ProductFormDialog
              isDialogOpen={isDialogOpen}
              setIsDialogOpen={setIsDialogOpen}
              editingProduct={editingProduct}
              formData={formData}
              setFormData={setFormData}
              addMode={addMode}
              setAddMode={setAddMode}
              aiKeywords={aiKeywords}
              setAiKeywords={setAiKeywords}
              aiCategory={aiCategory}
              setAiCategory={setAiCategory}
              aiTone={aiTone}
              setAiTone={setAiTone}
              isGenerating={isGenerating}
              aiGenerated={aiGenerated}
              isPending={isPending}
              suppliers={suppliers}
              stores={stores}
              handleOpenDialog={handleOpenDialog}
              handleAiGenerate={handleAiGenerate}
              handleApplyAiContent={handleApplyAiContent}
              handleSave={handleSave}
            />
          </div>
        </div>

        <ProductTable
          products={products}
          filteredProducts={filteredProducts}
          stores={stores}
          isSyncing={isSyncing}
          editingCell={editingCell}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          setSearchQuery={setSearchQuery}
          setStatusFilter={setStatusFilter}
          handleNaverSync={handleNaverSync}
          handleOpenDialog={handleOpenDialog}
          handleOpenCopyDialog={handleOpenCopyDialog}
          handleOpenDeleteDialog={handleOpenDeleteDialog}
          handleInlineEdit={handleInlineEdit}
          handleInlineSave={handleInlineSave}
          handleInlineCancel={handleInlineCancel}
          handleInlineKeyDown={handleInlineKeyDown}
        />
      </div>

      <CopyProductDialog
        copyDialogOpen={copyDialogOpen}
        setCopyDialogOpen={setCopyDialogOpen}
        copyTargetProduct={copyTargetProduct}
        copyTargetStoreId={copyTargetStoreId}
        setCopyTargetStoreId={setCopyTargetStoreId}
        stores={stores}
        isCopying={isCopying}
        handleCopyProduct={handleCopyProduct}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="상품 삭제"
        itemName={deleteTargetProduct?.name}
        description={`"${deleteTargetProduct?.name}" 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 주문 기록에는 영향을 주지 않습니다.`}
        onConfirm={handleDelete}
      />
    </>
  )
}
