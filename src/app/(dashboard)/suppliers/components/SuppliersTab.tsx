'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Plus, MoreHorizontal, Phone, MessageSquare, Edit, Trash, Settings, Clock } from 'lucide-react'
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
import type { SupplierWithStats } from '@/lib/actions/suppliers'
import type { ContactMethod } from '@/types/database.types'

export interface SupplierFormData {
  name: string
  contactNumber: string
  contactMethod: ContactMethod
  webhookUrl: string
}

interface SuppliersTabProps {
  suppliers: SupplierWithStats[]
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingSupplier: SupplierWithStats | null
  formData: SupplierFormData
  setFormData: Dispatch<SetStateAction<SupplierFormData>>
  isPending: boolean
  handleOpenDialog: (supplier?: SupplierWithStats) => void
  handleOpenSettings: (supplier: SupplierWithStats) => void
  handleOpenDeleteDialog: (type: 'supplier' | 'courier', id: string, name: string) => void
  handleSave: () => void
  formatDate: (dateString: string | null) => string
}

export function SuppliersTab({
  suppliers,
  isDialogOpen,
  setIsDialogOpen,
  editingSupplier,
  formData,
  setFormData,
  isPending,
  handleOpenDialog,
  handleOpenSettings,
  handleOpenDeleteDialog,
  handleSave,
  formatDate,
}: SuppliersTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
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
                    <SelectItem value="Telegram">Telegram</SelectItem>
                    <SelectItem value="Discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.contactMethod === 'Telegram' || formData.contactMethod === 'Discord' ? (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">
                    {formData.contactMethod === 'Telegram' ? 'Telegram Bot 웹훅 URL' : 'Discord 웹훅 URL'}
                  </Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, webhookUrl: e.target.value }))
                    }
                    placeholder={formData.contactMethod === 'Telegram'
                      ? 'https://api.telegram.org/bot...'
                      : 'https://discord.com/api/webhooks/...'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.contactMethod === 'Telegram'
                      ? 'BotFather에서 받은 봇 토큰으로 웹훅 URL을 구성하세요'
                      : 'Discord 채널 설정 > 연동 > 웹훅에서 URL을 복사하세요'}
                  </p>
                </div>
              ) : (
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
              )}
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
            <div className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">등록된 공급업체가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                공급업체를 등록하면 주문을 자동으로 전달하고 발주를 관리할 수 있습니다.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                공급업체 추가
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">업체명</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">연락처</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">연락방법</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">자동발송</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-center whitespace-nowrap">등록 상품</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">등록일</TableHead>
                    <TableHead className="text-xs font-semibold uppercase w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium whitespace-nowrap">{supplier.name}</TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {supplier.contactMethod === 'Telegram' || supplier.contactMethod === 'Discord'
                          ? (supplier.webhookUrl ? 'Webhook' : '-')
                          : (supplier.contactNumber || '-')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            supplier.contactMethod === 'Kakao'
                              ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              : supplier.contactMethod === 'SMS'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : supplier.contactMethod === 'Telegram'
                              ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          }
                        >
                          {supplier.contactMethod === 'Kakao' ? (
                            <MessageSquare className="h-3 w-3 mr-1" />
                          ) : supplier.contactMethod === 'SMS' ? (
                            <Phone className="h-3 w-3 mr-1" />
                          ) : (
                            <MessageSquare className="h-3 w-3 mr-1" />
                          )}
                          {supplier.contactMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {supplier.sendScheduleEnabled && supplier.sendScheduleTime ? (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {supplier.sendScheduleTime}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">{supplier.productCount}개</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
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
                            <DropdownMenuItem onClick={() => handleOpenSettings(supplier)}>
                              <Settings className="h-4 w-4 mr-2" />
                              설정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDialog(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog('supplier', supplier.id, supplier.name)}
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
    </>
  )
}
