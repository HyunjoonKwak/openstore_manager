'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, MoreHorizontal, Package, AlertTriangle, TrendingDown, CheckCircle, Edit, Trash, Search, RefreshCw, Upload, FileSpreadsheet, ShoppingBag, Ban } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { syncNaverProducts } from '@/lib/actions/naver-sync'
import { uploadProductsFromExcel, generateProductTemplate } from '@/lib/actions/excel-upload'
import type { SupplierWithStats } from '@/lib/actions/suppliers'
import { cn } from '@/lib/utils'

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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const defaultStoreId = stores[0]?.id || ''

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stockQuantity: '',
    sku: '',
    supplierId: '',
    storeId: defaultStoreId,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      stockQuantity: '',
      sku: '',
      supplierId: '',
      storeId: defaultStoreId,
    })
    setEditingProduct(null)
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
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
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
    if (!formData.name || !formData.price) {
      toast.error('상품명과 가격을 입력해주세요.')
      return
    }

    if (!formData.storeId) {
      toast.error('스토어를 먼저 등록해주세요.')
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

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteProduct(id)
      if (result.success) {
        const updatedProducts = products.filter((p) => p.id !== id)
        setProducts(updatedProducts)
        recalculateStats(updatedProducts)
        toast.success('상품이 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
    })
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || product.status === statusFilter

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
    { label: '전체 상품', value: stats.totalProducts, icon: Package, color: 'text-primary' },
    { label: '판매중', value: saleCount, icon: ShoppingBag, color: 'text-green-500' },
    { label: '판매금지/중지', value: prohibitionCount, icon: Ban, color: 'text-destructive' },
    { label: '재고부족/품절', value: stats.lowStock + stats.outOfStock, icon: AlertTriangle, color: 'text-warning' },
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
            <Card key={stat.label}>
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="SALE">판매중</SelectItem>
                <SelectItem value="PROHIBITION">판매금지</SelectItem>
                <SelectItem value="SUSPENSION">판매중지</SelectItem>
                <SelectItem value="WAIT">승인대기</SelectItem>
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
              네이버 동기화
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? '상품 수정' : '새 상품 추가'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? '저장 중...' : editingProduct ? '수정' : '추가'}
                  </Button>
                </DialogFooter>
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
                <p className="text-muted-foreground">
                  {products.length === 0 ? '등록된 상품이 없습니다.' : '검색 결과가 없습니다.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase w-16">이미지</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">상품명</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">카테고리</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">가격</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center">재고</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center">판매상태</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center">재고상태</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {product.category ? (
                          <span className="line-clamp-1">{product.category.split('>').pop()}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {product.stockQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(product.status)}
                      </TableCell>
                      <TableCell className="text-center">
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
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(product.id)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
