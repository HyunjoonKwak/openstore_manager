'use client'

import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, MoreHorizontal, Package, Edit, Trash, RefreshCw, FileText, Check, X, Pencil, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductWithSupplier } from '@/lib/actions/products'
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

interface ProductTableProps {
  products: ProductWithSupplier[]
  filteredProducts: ProductWithSupplier[]
  stores: { id: string; storeName: string }[]
  isSyncing: boolean
  editingCell: { id: string; field: 'price' | 'stockQuantity' } | null
  editingValue: string
  setEditingValue: (value: string) => void
  setSearchQuery: (value: string) => void
  setStatusFilter: (value: string) => void
  handleNaverSync: () => void
  handleOpenDialog: (product?: ProductWithSupplier) => void
  handleOpenCopyDialog: (product: ProductWithSupplier) => void
  handleOpenDeleteDialog: (product: ProductWithSupplier) => void
  handleInlineEdit: (id: string, field: 'price' | 'stockQuantity', currentValue: number) => void
  handleInlineSave: () => void
  handleInlineCancel: () => void
  handleInlineKeyDown: (e: KeyboardEvent) => void
}

export function ProductTable({
  products,
  filteredProducts,
  stores,
  isSyncing,
  editingCell,
  editingValue,
  setEditingValue,
  setSearchQuery,
  setStatusFilter,
  handleNaverSync,
  handleOpenDialog,
  handleOpenCopyDialog,
  handleOpenDeleteDialog,
  handleInlineEdit,
  handleInlineSave,
  handleInlineCancel,
  handleInlineKeyDown,
}: ProductTableProps) {
  const router = useRouter()

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

  return (
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
        <ResponsiveTable>
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
        </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  )
}
