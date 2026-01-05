'use client'

import { useState, useTransition } from 'react'
import { Plus, MoreHorizontal, Phone, MessageSquare, Edit, Trash } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierWithStats,
} from '@/lib/actions/suppliers'
import type { ContactMethod } from '@/types/database.types'

interface SuppliersClientProps {
  initialSuppliers: SupplierWithStats[]
}

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>(initialSuppliers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null)
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    contactMethod: 'Kakao' as ContactMethod,
  })

  const resetForm = () => {
    setFormData({ name: '', contactNumber: '', contactMethod: 'Kakao' })
    setEditingSupplier(null)
  }

  const handleOpenDialog = (supplier?: SupplierWithStats) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name,
        contactNumber: supplier.contactNumber || '',
        contactMethod: supplier.contactMethod,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.contactNumber) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    startTransition(async () => {
      if (editingSupplier) {
        const result = await updateSupplier({
          id: editingSupplier.id,
          name: formData.name,
          contactNumber: formData.contactNumber,
          contactMethod: formData.contactMethod,
        })

        if (result.success) {
          setSuppliers((prev) =>
            prev.map((s) =>
              s.id === editingSupplier.id
                ? { ...s, ...formData }
                : s
            )
          )
          toast.success('공급업체 정보가 수정되었습니다.')
        } else {
          toast.error(result.error || '수정에 실패했습니다.')
        }
      } else {
        const result = await createSupplier({
          name: formData.name,
          contactNumber: formData.contactNumber,
          contactMethod: formData.contactMethod,
        })

        if (result.data) {
          setSuppliers((prev) => [result.data!, ...prev])
          toast.success('새 공급업체가 추가되었습니다.')
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
      const result = await deleteSupplier(id)
      if (result.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id))
        toast.success('공급업체가 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <>
      <Header title="공급업체 관리" subtitle="Supplier Management" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">공급업체 목록</h2>
            <Badge variant="secondary">{suppliers.length}개</Badge>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                공급업체 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? '공급업체 수정' : '새 공급업체 추가'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">업체명</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="업체명을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">연락처</Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))
                    }
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactMethod">연락 방법</Label>
                  <Select
                    value={formData.contactMethod}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactMethod: value as ContactMethod,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kakao">카카오톡</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? '저장 중...' : editingSupplier ? '수정' : '추가'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-base font-semibold">등록된 공급업체</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {suppliers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                등록된 공급업체가 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase">업체명</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">연락처</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">연락방법</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center">등록 상품</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">등록일</TableHead>
                    <TableHead className="text-xs font-semibold uppercase w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {supplier.contactNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            supplier.contactMethod === 'Kakao'
                              ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }
                        >
                          {supplier.contactMethod === 'Kakao' ? (
                            <MessageSquare className="h-3 w-3 mr-1" />
                          ) : (
                            <Phone className="h-3 w-3 mr-1" />
                          )}
                          {supplier.contactMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{supplier.productCount}개</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(supplier.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(supplier.id)}
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
