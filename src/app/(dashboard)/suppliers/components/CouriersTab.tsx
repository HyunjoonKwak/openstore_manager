'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Plus, MoreHorizontal, Edit, Trash, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DialogDescription,
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
import type { CourierData } from '@/lib/actions/couriers'

export interface CourierFormData {
  name: string
  code: string
  isDefault: boolean
}

interface CouriersTabProps {
  couriers: CourierData[]
  courierCodes: { code: string; name: string }[]
  isCourierDialogOpen: boolean
  setIsCourierDialogOpen: (open: boolean) => void
  editingCourier: CourierData | null
  courierFormData: CourierFormData
  setCourierFormData: Dispatch<SetStateAction<CourierFormData>>
  isPending: boolean
  handleOpenCourierDialog: (courier?: CourierData) => void
  handleOpenDeleteDialog: (type: 'supplier' | 'courier', id: string, name: string) => void
  handleSaveCourier: () => void
  formatDate: (dateString: string | null) => string
}

export function CouriersTab({
  couriers,
  courierCodes,
  isCourierDialogOpen,
  setIsCourierDialogOpen,
  editingCourier,
  courierFormData,
  setCourierFormData,
  isPending,
  handleOpenCourierDialog,
  handleOpenDeleteDialog,
  handleSaveCourier,
  formatDate,
}: CouriersTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">택배업체 목록</h2>
          <Badge variant="secondary">{couriers.length}개</Badge>
        </div>

        <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenCourierDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              택배업체 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourier ? '택배업체 수정' : '새 택배업체 추가'}
              </DialogTitle>
              <DialogDescription>
                사용할 택배사를 선택하고 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="courierCode">택배사 선택</Label>
                <Select
                  value={courierFormData.code}
                  onValueChange={(value) => {
                    const selected = courierCodes.find(c => c.code === value)
                    setCourierFormData((prev) => ({
                      ...prev,
                      code: value,
                      name: selected?.name || prev.name,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="택배사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courierName">표시명 (선택)</Label>
                <Input
                  id="courierName"
                  value={courierFormData.name}
                  onChange={(e) =>
                    setCourierFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="표시할 이름 (비워두면 기본 이름 사용)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={courierFormData.isDefault}
                  onCheckedChange={(checked) =>
                    setCourierFormData((prev) => ({ ...prev, isDefault: checked }))
                  }
                />
                <Label>기본 택배업체로 설정</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCourierDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveCourier} disabled={isPending}>
                {isPending ? '저장 중...' : editingCourier ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-base font-semibold">등록된 택배업체</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {couriers.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">등록된 택배업체가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                택배업체를 등록하면 운송장 번호 관리와 배송 추적이 가능합니다.
              </p>
              <Button onClick={() => handleOpenCourierDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                택배업체 추가
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">업체명</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">코드</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">기본</TableHead>
                    <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">등록일</TableHead>
                    <TableHead className="text-xs font-semibold uppercase w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {couriers.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {courier.name}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="font-mono">
                          {courier.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {courier.isDefault ? (
                          <Badge variant="default">기본</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(courier.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenCourierDialog(courier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog('courier', courier.id, courier.name)}
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
