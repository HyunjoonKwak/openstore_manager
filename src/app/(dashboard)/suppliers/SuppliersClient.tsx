'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, MoreHorizontal, Phone, MessageSquare, Edit, Trash, Settings, Truck, Clock, FileText, Variable, Copy, Info } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import {
  createCourier,
  updateCourier,
  deleteCourier,
  getCourierCodes,
  type CourierData,
} from '@/lib/actions/couriers'
import type { ContactMethod } from '@/types/database.types'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'

interface SuppliersClientProps {
  initialSuppliers: SupplierWithStats[]
  initialCouriers: CourierData[]
}

const DEFAULT_TEMPLATE = `[발주서] {date}

{supplier_name} 담당자님께

금일 발주 내역을 전달드립니다.

{order_list}

총 {order_count}건, {total_quantity}개

확인 부탁드립니다.
감사합니다.`

const TEMPLATE_VARIABLES = [
  { key: 'supplier_name', label: '공급업체명', description: '공급업체 이름', example: '(주)ABC상사' },
  { key: 'date', label: '날짜', description: '오늘 날짜', example: '2024. 1. 5.' },
  { key: 'order_count', label: '주문 건수', description: '선택된 주문 개수', example: '5' },
  { key: 'total_quantity', label: '총 수량', description: '전체 상품 수량 합계', example: '23' },
  { key: 'order_list', label: '주문 목록', description: '상품명, 옵션, 수량 목록', example: '- 상품A (옵션1) x3\n- 상품B x2' },
  { key: 'receiver_list', label: '수령인 목록', description: '수령인별 상세 정보', example: '1. 홍길동 / 010-1234-5678\n   서울시 강남구...' },
  { key: 'total_amount', label: '총 금액', description: '주문 총액 (원)', example: '150,000' },
]

export function SuppliersClient({ initialSuppliers, initialCouriers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>(initialSuppliers)
  const [couriers, setCouriers] = useState<CourierData[]>(initialCouriers)
  const [courierCodes, setCourierCodes] = useState<{ code: string; name: string }[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null)
  const [editingCourier, setEditingCourier] = useState<CourierData | null>(null)
  const [settingsSupplier, setSettingsSupplier] = useState<SupplierWithStats | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'supplier' | 'courier'; id: string; name: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    contactMethod: 'Kakao' as ContactMethod,
  })

  const [courierFormData, setCourierFormData] = useState({
    name: '',
    code: '',
    isDefault: false,
  })

  const [settingsData, setSettingsData] = useState({
    messageTemplate: '',
    sendScheduleTime: '',
    sendScheduleEnabled: false,
    autoSendEnabled: false,
    courierId: '',
    defaultCourierAccount: '',
  })

  useEffect(() => {
    getCourierCodes().then(setCourierCodes)
  }, [])

  const resetForm = () => {
    setFormData({ name: '', contactNumber: '', contactMethod: 'Kakao' })
    setEditingSupplier(null)
  }

  const resetCourierForm = () => {
    setCourierFormData({ name: '', code: '', isDefault: false })
    setEditingCourier(null)
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

  const handleOpenCourierDialog = (courier?: CourierData) => {
    if (courier) {
      setEditingCourier(courier)
      setCourierFormData({
        name: courier.name,
        code: courier.code,
        isDefault: courier.isDefault,
      })
    } else {
      resetCourierForm()
    }
    setIsCourierDialogOpen(true)
  }

  const handleOpenSettings = (supplier: SupplierWithStats) => {
    setSettingsSupplier(supplier)
    setSettingsData({
      messageTemplate: supplier.messageTemplate || DEFAULT_TEMPLATE,
      sendScheduleTime: supplier.sendScheduleTime || '',
      sendScheduleEnabled: supplier.sendScheduleEnabled,
      autoSendEnabled: supplier.autoSendEnabled,
      courierId: supplier.courierId || '',
      defaultCourierAccount: supplier.defaultCourierAccount || '',
    })
    setIsSettingsDialogOpen(true)
  }

  const handleSave = () => {
    const errors: string[] = []
    
    if (!formData.name.trim()) {
      errors.push('업체명')
    }
    if (!formData.contactNumber.trim()) {
      errors.push('연락처')
    } else {
      const phonePattern = /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/
      if (!phonePattern.test(formData.contactNumber.replace(/-/g, ''))) {
        errors.push('유효한 연락처 형식 (예: 010-1234-5678)')
      }
    }
    
    if (errors.length > 0) {
      toast.error(`다음 항목을 확인해주세요: ${errors.join(', ')}`)
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

  const handleSaveCourier = () => {
    if (!courierFormData.code) {
      toast.error('택배사를 선택해주세요.')
      return
    }
    if (!courierFormData.name.trim()) {
      toast.error('표시명을 입력해주세요.')
      return
    }

    startTransition(async () => {
      if (editingCourier) {
        const result = await updateCourier({
          id: editingCourier.id,
          name: courierFormData.name,
          code: courierFormData.code,
          isDefault: courierFormData.isDefault,
        })

        if (result.success) {
          setCouriers((prev) =>
            prev.map((c) =>
              c.id === editingCourier.id
                ? { ...c, ...courierFormData }
                : courierFormData.isDefault 
                  ? { ...c, isDefault: false }
                  : c
            )
          )
          toast.success('택배업체 정보가 수정되었습니다.')
        } else {
          toast.error(result.error || '수정에 실패했습니다.')
        }
      } else {
        const result = await createCourier({
          name: courierFormData.name,
          code: courierFormData.code,
          isDefault: courierFormData.isDefault,
        })

        if (result.data) {
          if (courierFormData.isDefault) {
            setCouriers((prev) => [result.data!, ...prev.map(c => ({ ...c, isDefault: false }))])
          } else {
            setCouriers((prev) => [result.data!, ...prev])
          }
          toast.success('새 택배업체가 추가되었습니다.')
        } else {
          toast.error(result.error || '추가에 실패했습니다.')
        }
      }

      setIsCourierDialogOpen(false)
      resetCourierForm()
    })
  }

  const handleSaveSettings = () => {
    if (!settingsSupplier) return

    startTransition(async () => {
      const result = await updateSupplier({
        id: settingsSupplier.id,
        messageTemplate: settingsData.messageTemplate || null,
        sendScheduleTime: settingsData.sendScheduleTime || null,
        sendScheduleEnabled: settingsData.sendScheduleEnabled,
        autoSendEnabled: settingsData.autoSendEnabled,
        courierId: settingsData.courierId || null,
        defaultCourierAccount: settingsData.defaultCourierAccount || null,
      })

      if (result.success) {
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === settingsSupplier.id
              ? { 
                  ...s, 
                  messageTemplate: settingsData.messageTemplate || null,
                  sendScheduleTime: settingsData.sendScheduleTime || null,
                  sendScheduleEnabled: settingsData.sendScheduleEnabled,
                  autoSendEnabled: settingsData.autoSendEnabled,
                  courierId: settingsData.courierId || null,
                  defaultCourierAccount: settingsData.defaultCourierAccount || null,
                }
              : s
          )
        )
        toast.success('설정이 저장되었습니다.')
        setIsSettingsDialogOpen(false)
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleOpenDeleteDialog = (type: 'supplier' | 'courier', id: string, name: string) => {
    setDeleteTarget({ type, id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    
    if (deleteTarget.type === 'supplier') {
      const result = await deleteSupplier(deleteTarget.id)
      if (result.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id))
        toast.success('공급업체가 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다. 연결된 상품이 있는지 확인해주세요.')
      }
    } else {
      const result = await deleteCourier(deleteTarget.id)
      if (result.success) {
        setCouriers((prev) => prev.filter((c) => c.id !== deleteTarget.id))
        toast.success('택배업체가 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다. 연결된 공급업체가 있는지 확인해주세요.')
      }
    }
    setDeleteTarget(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <>
      <Header title="공급업체 관리" subtitle="Supplier Management" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">공급업체</TabsTrigger>
            <TabsTrigger value="couriers">택배업체</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase">업체명</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">연락처</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">연락방법</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">자동발송</TableHead>
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
                          <TableCell>
                            {supplier.sendScheduleEnabled && supplier.sendScheduleTime ? (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {supplier.sendScheduleTime}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="couriers" className="space-y-4">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase">업체명</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">코드</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">기본</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">등록일</TableHead>
                        <TableHead className="text-xs font-semibold uppercase w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {couriers.map((courier) => (
                        <TableRow key={courier.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {courier.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {courier.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {courier.isDefault ? (
                              <Badge variant="default">기본</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {settingsSupplier?.name} 설정
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label>메시지 템플릿</Label>
                </div>
                
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground mr-1 py-1">변수:</span>
                  <TooltipProvider delayDuration={200}>
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Tooltip key={v.key}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-mono px-2"
                            onClick={() => {
                              const textarea = document.getElementById('messageTemplate') as HTMLTextAreaElement
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const text = settingsData.messageTemplate
                                const newText = text.substring(0, start) + `{${v.key}}` + text.substring(end)
                                setSettingsData((prev) => ({ ...prev, messageTemplate: newText }))
                                setTimeout(() => {
                                  textarea.focus()
                                  textarea.setSelectionRange(start + v.key.length + 2, start + v.key.length + 2)
                                }, 0)
                              } else {
                                setSettingsData((prev) => ({ 
                                  ...prev, 
                                  messageTemplate: prev.messageTemplate + `{${v.key}}` 
                                }))
                              }
                            }}
                          >
                            {`{${v.key}}`}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px]">
                          <p className="font-medium">{v.label}</p>
                          <p className="text-xs text-muted-foreground">{v.description}</p>
                          <p className="text-xs mt-1 font-mono bg-muted px-1 rounded">예: {v.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
                
                <Textarea
                  id="messageTemplate"
                  value={settingsData.messageTemplate}
                  onChange={(e) =>
                    setSettingsData((prev) => ({ ...prev, messageTemplate: e.target.value }))
                  }
                  className="min-h-[200px] font-mono text-sm"
                  placeholder={DEFAULT_TEMPLATE}
                />
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>변수 버튼을 클릭하면 커서 위치에 삽입됩니다</span>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label>자동 발송 스케줄</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">발송 시간</Label>
                    <Input
                      type="time"
                      value={settingsData.sendScheduleTime}
                      onChange={(e) =>
                        setSettingsData((prev) => ({ ...prev, sendScheduleTime: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settingsData.sendScheduleEnabled}
                        onCheckedChange={(checked) =>
                          setSettingsData((prev) => ({ ...prev, sendScheduleEnabled: checked }))
                        }
                      />
                      <Label>스케줄 활성화</Label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settingsData.autoSendEnabled}
                    onCheckedChange={(checked) =>
                      setSettingsData((prev) => ({ ...prev, autoSendEnabled: checked }))
                    }
                  />
                  <Label>주문 접수 시 자동 발송</Label>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <Label>택배 설정</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">기본 택배업체</Label>
                    <Select
                      value={settingsData.courierId || 'no-courier'}
                      onValueChange={(value) =>
                        setSettingsData((prev) => ({ 
                          ...prev, 
                          courierId: value === 'no-courier' ? '' : value 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="택배업체 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-courier">선택 안함</SelectItem>
                        {couriers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">계약 코드</Label>
                    <Input
                      value={settingsData.defaultCourierAccount}
                      onChange={(e) =>
                        setSettingsData((prev) => ({ ...prev, defaultCourierAccount: e.target.value }))
                      }
                      placeholder="계약번호/코드"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveSettings} disabled={isPending}>
                {isPending ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={deleteTarget?.type === 'supplier' ? '공급업체 삭제' : '택배업체 삭제'}
          itemName={deleteTarget?.name}
          description={
            deleteTarget?.type === 'supplier'
              ? `"${deleteTarget?.name}" 공급업체를 삭제하시겠습니까? 연결된 상품의 공급업체 정보가 해제됩니다.`
              : `"${deleteTarget?.name}" 택배업체를 삭제하시겠습니까? 연결된 공급업체의 택배 설정이 해제됩니다.`
          }
          onConfirm={handleConfirmDelete}
        />
      </div>
    </>
  )
}
