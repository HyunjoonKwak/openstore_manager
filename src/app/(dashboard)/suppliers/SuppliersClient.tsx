'use client'

import { useState, useTransition, useEffect } from 'react'
import { Header } from '@/components/layouts/Header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { sendTestNotification } from '@/lib/notifications'
import { SuppliersTab } from './components/SuppliersTab'
import { CouriersTab } from './components/CouriersTab'
import { SupplierSettingsDialog, DEFAULT_TEMPLATE } from './components/SupplierSettingsDialog'

interface SuppliersClientProps {
  initialSuppliers: SupplierWithStats[]
  initialCouriers: CourierData[]
}

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
    webhookUrl: '',
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

  const [showPreview, setShowPreview] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)

  useEffect(() => {
    getCourierCodes()
      .then(setCourierCodes)
      .catch(() => setCourierCodes([]))
  }, [])

  const resetForm = () => {
    setFormData({ name: '', contactNumber: '', contactMethod: 'Kakao', webhookUrl: '' })
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
        webhookUrl: supplier.webhookUrl || '',
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
    setShowPreview(false)
    setIsSettingsDialogOpen(true)
  }

  const isWebhookMethod = formData.contactMethod === 'Telegram' || formData.contactMethod === 'Discord'

  const handleSendTest = async () => {
    if (!settingsSupplier) return

    const isWebhook = settingsSupplier.contactMethod === 'Telegram' || settingsSupplier.contactMethod === 'Discord'

    if (isWebhook && !settingsSupplier.webhookUrl) {
      toast.error('웹훅 URL이 설정되지 않았습니다.')
      return
    }
    if (!isWebhook && !settingsSupplier.contactNumber) {
      toast.error('연락처가 설정되지 않았습니다.')
      return
    }

    setIsSendingTest(true)
    try {
      const result = await sendTestNotification({
        supplierName: settingsSupplier.name,
        contactMethod: settingsSupplier.contactMethod,
        contactNumber: settingsSupplier.contactNumber || undefined,
        webhookUrl: settingsSupplier.webhookUrl || undefined,
        messageTemplate: settingsData.messageTemplate || DEFAULT_TEMPLATE,
      })

      if (result.success) {
        toast.success(`테스트 메시지가 ${result.method}로 발송되었습니다.`)
      } else {
        toast.error(result.error || '테스트 발송에 실패했습니다.')
      }
    } catch {
      toast.error('테스트 발송 중 오류가 발생했습니다.')
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleSave = () => {
    const errors: string[] = []

    if (!formData.name.trim()) {
      errors.push('업체명')
    }

    if (isWebhookMethod) {
      if (!formData.webhookUrl.trim()) {
        errors.push('웹훅 URL')
      } else if (!formData.webhookUrl.startsWith('https://')) {
        errors.push('유효한 웹훅 URL (https://로 시작)')
      }
    } else {
      if (!formData.contactNumber.trim()) {
        errors.push('연락처')
      } else {
        const phonePattern = /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/
        if (!phonePattern.test(formData.contactNumber.replace(/-/g, ''))) {
          errors.push('유효한 연락처 형식 (예: 010-1234-5678)')
        }
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
          contactNumber: isWebhookMethod ? undefined : formData.contactNumber,
          contactMethod: formData.contactMethod,
          webhookUrl: isWebhookMethod ? formData.webhookUrl : undefined,
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
          contactNumber: isWebhookMethod ? undefined : formData.contactNumber,
          contactMethod: formData.contactMethod,
          webhookUrl: isWebhookMethod ? formData.webhookUrl : undefined,
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
            <SuppliersTab
              suppliers={suppliers}
              isDialogOpen={isDialogOpen}
              setIsDialogOpen={setIsDialogOpen}
              editingSupplier={editingSupplier}
              formData={formData}
              setFormData={setFormData}
              isPending={isPending}
              handleOpenDialog={handleOpenDialog}
              handleOpenSettings={handleOpenSettings}
              handleOpenDeleteDialog={handleOpenDeleteDialog}
              handleSave={handleSave}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="couriers" className="space-y-4">
            <CouriersTab
              couriers={couriers}
              courierCodes={courierCodes}
              isCourierDialogOpen={isCourierDialogOpen}
              setIsCourierDialogOpen={setIsCourierDialogOpen}
              editingCourier={editingCourier}
              courierFormData={courierFormData}
              setCourierFormData={setCourierFormData}
              isPending={isPending}
              handleOpenCourierDialog={handleOpenCourierDialog}
              handleOpenDeleteDialog={handleOpenDeleteDialog}
              handleSaveCourier={handleSaveCourier}
              formatDate={formatDate}
            />
          </TabsContent>
        </Tabs>

        <SupplierSettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          settingsSupplier={settingsSupplier}
          settingsData={settingsData}
          setSettingsData={setSettingsData}
          couriers={couriers}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          isSendingTest={isSendingTest}
          handleSendTest={handleSendTest}
          handleSaveSettings={handleSaveSettings}
          isPending={isPending}
        />

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
