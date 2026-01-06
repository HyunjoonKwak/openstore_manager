'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, MoreHorizontal, Package, AlertTriangle, TrendingDown, CheckCircle, Edit, Trash, Search, RefreshCw, Upload, FileSpreadsheet, ShoppingBag, Ban, FileText, ArrowUpRight, ImageIcon, Check, X, Pencil, Copy, Sparkles, Loader2 } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const STATUS_LABELS: Record<string, string> = {
  SALE: '판매중',
  PROHIBITION: '판매금지',
  SUSPENSION: '판매중지',
  WAIT: '승인대기',
  UNADMISSION: '미승인',
  REJECTION: '거부',
  DELETE: '삭제',
}

const STATUS_COLORS: Record<string, string> = {
  SALE: 'bg-green-500/10 text-green-500 border-green-500/20',
  PROHIBITION: 'bg-red-500/10 text-red-500 border-red-500/20',
  SUSPENSION: 'bg-warning/10 text-warning border-warning/20',
  WAIT: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  UNADMISSION: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  REJECTION: 'bg-red-500/10 text-red-500 border-red-500/20',
  DELETE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

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
        throw new Error('Generation failed')
      }

      const data = await response.json()
      setAiGenerated(data)
      toast.success('AI가 상품 정보를 생성했습니다!')
    } catch {
      toast.error('API 키가 설정되지 않았습니다. 설정 페이지에서 OpenAI API 키를 입력하세요.')
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">품절</Badge>
    }
    if (quantity <= 10) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">재고 부족</Badge>
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">정상</Badge>
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">-</Badge>
    const label = STATUS_LABELS[status] || status
    const colorClass = STATUS_COLORS[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    return <Badge variant="outline" className={colorClass}>{label}</Badge>
  }

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
          </div>
        </div>

        <Card>
          <CardHeader className="border-b border-border py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">상품 목록</CardTitle>
              <span className="text-sm text-muted-foreground">
                {filteredProducts.length}개 상품
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {products.length === 0 ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">등록된 상품이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">
                      상품을 직접 추가하거나 네이버 스마트스토어에서 동기화해보세요.
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={handleNaverSync} disabled={isSyncing}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
                        네이버에서 동기화
                      </Button>
                      <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        상품 추가
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                    <p className="text-muted-foreground mb-4">
                      다른 검색어로 다시 시도하거나 필터를 변경해보세요.
                    </p>
                    <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('SALE'); }}>
                      검색 초기화
                    </Button>
                  </>
                )}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase w-16 whitespace-nowrap">이미지</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">상품명</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">카테고리</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right whitespace-nowrap">가격</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center whitespace-nowrap">재고</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center whitespace-nowrap">판매상태</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center whitespace-nowrap">재고상태</TableHead>
                    <TableHead className="text-xs font-semibold uppercase w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {product.category ? (
                          <span className="line-clamp-1">{product.category.split('>').pop()}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {editingCell?.id === product.id && editingCell?.field === 'price' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={handleInlineKeyDown}
                              className="h-7 w-24 text-right"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleInlineSave}>
                              <Check className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleInlineCancel}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="font-medium hover:text-primary hover:underline cursor-pointer"
                            onClick={() => handleInlineEdit(product.id, 'price', product.price)}
                          >
                            {formatPrice(product.price)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {editingCell?.id === product.id && editingCell?.field === 'stockQuantity' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={handleInlineKeyDown}
                              className="h-7 w-20 text-center"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleInlineSave}>
                              <Check className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleInlineCancel}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="font-medium hover:text-primary hover:underline cursor-pointer"
                            onClick={() => handleInlineEdit(product.id, 'stockQuantity', product.stockQuantity)}
                          >
                            {product.stockQuantity.toLocaleString()}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {getStatusBadge(product.status)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {getStockBadge(product.stockQuantity)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              빠른 수정
                            </DropdownMenuItem>
                            {product.platformProductId ? (
                              <DropdownMenuItem onClick={() => router.push(`/inventory/${product.id}/detail`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                네이버 상세편집
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                상세 수정
                              </DropdownMenuItem>
                            )}
                            {stores.length > 1 && (
                              <DropdownMenuItem onClick={() => handleOpenCopyDialog(product)}>
                                <Copy className="h-4 w-4 mr-2" />
                                다른 스토어로 복사
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog(product)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

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
