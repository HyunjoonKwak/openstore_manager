'use client'

import { useState, useRef, useTransition } from 'react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Package,
  Truck,
  Send,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  FlaskConical,
  Trash2,
  Info,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type DispatchOrder,
  type CourierOption,
  updateOrderTrackingNumber,
  dispatchOrdersToNaver,
  downloadOrdersExcel,
  uploadTrackingExcel,
  createTestOrders,
  deleteTestOrders,
} from '@/lib/actions/dispatch'
import { useDefaultFolder } from '@/hooks/useDefaultFolder'

interface DispatchClientProps {
  initialOrders: DispatchOrder[]
  couriers: CourierOption[]
}

type WorkflowStep = 1 | 2 | 3

const WORKFLOW_STEPS = [
  { step: 1, title: '운송장 입력', description: '택배사에서 받은 운송장번호를 입력하세요', icon: Package },
  { step: 2, title: '발송 확인', description: '입력된 운송장을 확인하세요', icon: Truck },
  { step: 3, title: '네이버 발송처리', description: '네이버 스마트스토어에 발송 등록', icon: Send },
]

export function DispatchClient({ initialOrders, couriers }: DispatchClientProps) {
  const [orders, setOrders] = useState<DispatchOrder[]>(initialOrders)
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string>(
    couriers.find(c => c.isDefault)?.code || couriers[0]?.code || 'CJGLS'
  )
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)
  const [dispatchResults, setDispatchResults] = useState<Array<{ orderId: string; success: boolean; error?: string }>>([])
  const [testMode, setTestMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { orderDownloadPath, trackingUploadPath } = useDefaultFolder()

  const pendingOrders = orders.filter(o => !o.trackingNumber)
  const readyOrders = orders.filter(o => o.trackingNumber && o.status !== 'Dispatched')
  const dispatchedOrders = orders.filter(o => o.status === 'Dispatched')

  const handleSelectAll = (checked: boolean) => {
    if (currentStep === 1) {
      setSelectedIds(checked ? pendingOrders.map(o => o.id) : [])
    } else if (currentStep === 2) {
      setSelectedIds(checked ? readyOrders.map(o => o.id) : [])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id))
    }
  }

  const handleTrackingInput = (orderId: string, value: string) => {
    setTrackingInputs({ ...trackingInputs, [orderId]: value })
  }

  const handleSaveTracking = async (orderId: string) => {
    const trackingNumber = trackingInputs[orderId]
    if (!trackingNumber?.trim()) {
      toast.error('운송장 번호를 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await updateOrderTrackingNumber(orderId, trackingNumber.trim(), selectedCourier)
      if (result.success) {
        setOrders(orders.map(o =>
          o.id === orderId
            ? { ...o, trackingNumber: trackingNumber.trim(), courierCode: selectedCourier }
            : o
        ))
        setTrackingInputs({ ...trackingInputs, [orderId]: '' })
        toast.success('운송장이 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleBulkSaveTracking = async () => {
    const updates = selectedIds
      .map(id => ({
        orderId: id,
        trackingNumber: trackingInputs[id]?.trim() || '',
        courierCode: selectedCourier,
      }))
      .filter(u => u.trackingNumber)

    if (updates.length === 0) {
      toast.error('저장할 운송장이 없습니다.')
      return
    }

    startTransition(async () => {
      for (const update of updates) {
        await updateOrderTrackingNumber(update.orderId, update.trackingNumber, update.courierCode)
      }
      setOrders(orders.map(o => {
        const update = updates.find(u => u.orderId === o.id)
        return update
          ? { ...o, trackingNumber: update.trackingNumber, courierCode: update.courierCode }
          : o
      }))
      setSelectedIds([])
      setTrackingInputs({})
      toast.success(`${updates.length}건의 운송장이 저장되었습니다.`)
    })
  }

  const handleDispatchToNaver = async () => {
    if (selectedIds.length === 0) {
      toast.error('발송할 주문을 선택해주세요.')
      return
    }

    setIsDispatchDialogOpen(true)
    setDispatchResults([])

    startTransition(async () => {
      const result = await dispatchOrdersToNaver(selectedIds, testMode)
      setDispatchResults(result.results)

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length
        setOrders(orders.map(o => {
          const res = result.results.find(r => r.orderId === o.id)
          return res?.success ? { ...o, status: 'Dispatched' } : o
        }))
        setSelectedIds([])
        toast.success(`${successCount}건이 발송처리 되었습니다.`)
      } else {
        toast.error(result.error || '발송처리에 실패했습니다.')
      }
    })
  }

  const handleDownloadExcel = async () => {
    startTransition(async () => {
      const result = await downloadOrdersExcel()
      if (result.data) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.data), c => c.charCodeAt(0))],
          { type: 'text/csv;charset=utf-8' }
        )

        if ('showSaveFilePicker' in window && orderDownloadPath) {
          try {
            const handle = await (window as unknown as { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
              suggestedName: result.filename,
              types: [{
                description: 'CSV 파일',
                accept: { 'text/csv': ['.csv'] },
              }],
            })
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
            toast.success('주문 목록이 다운로드 되었습니다.', {
              description: orderDownloadPath ? `설정된 폴더: ${orderDownloadPath}` : undefined,
            })
            return
          } catch (err) {
            if ((err as Error).name === 'AbortError') {
              return
            }
          }
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('주문 목록이 다운로드 되었습니다.', {
          description: orderDownloadPath ? `설정된 폴더로 저장하세요: ${orderDownloadPath}` : undefined,
        })
      } else {
        toast.error(result.error || '다운로드에 실패했습니다.')
      }
    })
  }

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await uploadTrackingExcel(formData)
      if (result.success) {
        toast.success(`${result.updatedCount}건의 운송장이 업로드 되었습니다.`)
        window.location.reload()
      } else {
        toast.error(result.errors[0] || '업로드에 실패했습니다.')
      }
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadWithPicker = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as unknown as { showOpenFilePicker: (options: { types: { description: string; accept: Record<string, string[]> }[]; multiple: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{
            description: 'Excel/CSV 파일',
            accept: { 
              'text/csv': ['.csv'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
            },
          }],
          multiple: false,
        })
        const file = await handle.getFile()
        const formData = new FormData()
        formData.append('file', file)

        startTransition(async () => {
          const result = await uploadTrackingExcel(formData)
          if (result.success) {
            toast.success(`${result.updatedCount}건의 운송장이 업로드 되었습니다.`)
            window.location.reload()
          } else {
            toast.error(result.errors[0] || '업로드에 실패했습니다.')
          }
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          fileInputRef.current?.click()
        }
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleCreateTestOrders = async () => {
    startTransition(async () => {
      const result = await createTestOrders(3)
      if (result.success) {
        toast.success(`${result.createdCount}건의 테스트 주문이 생성되었습니다.`)
        window.location.reload()
      } else {
        toast.error(result.error || '생성에 실패했습니다.')
      }
    })
  }

  const handleDeleteTestOrders = async () => {
    startTransition(async () => {
      const result = await deleteTestOrders()
      if (result.success) {
        toast.success(`${result.deletedCount}건의 테스트 주문이 삭제되었습니다.`)
        window.location.reload()
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price)
  }

  const currentOrders = currentStep === 1 ? pendingOrders : currentStep === 2 ? readyOrders : dispatchedOrders

  return (
    <>
      <Header title="발송처리" subtitle="Dispatch Orders" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleUploadExcel}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {WORKFLOW_STEPS.map((step, idx) => (
                <div key={step.step} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.step as WorkflowStep)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      currentStep === step.step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <step.icon className="h-4 w-4" />
                    <span className="font-medium">{step.title}</span>
                    <Badge variant={currentStep === step.step ? 'secondary' : 'outline'} className="ml-1">
                      {step.step === 1 ? pendingOrders.length : step.step === 2 ? readyOrders.length : dispatchedOrders.length}
                    </Badge>
                  </button>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Checkbox
                  checked={testMode}
                  onCheckedChange={(checked) => setTestMode(checked as boolean)}
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" />
                  테스트 모드
                </span>
              </div>
            </div>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {WORKFLOW_STEPS[currentStep - 1].description}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50" onClick={() => setCurrentStep(1)}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-warning/10 text-warning p-2">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">운송장 대기</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50" onClick={() => setCurrentStep(2)}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-blue-500/10 text-blue-500 p-2">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">발송 대기</p>
                <p className="text-2xl font-bold">{readyOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50" onClick={() => setCurrentStep(3)}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-green-500/10 text-green-500 p-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">발송 완료</p>
                <p className="text-2xl font-bold">{dispatchedOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-primary/10 text-primary p-2">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 주문</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Select value={selectedCourier} onValueChange={setSelectedCourier}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="택배사 선택" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentStep === 1 && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={handleDownloadExcel} disabled={isPending}>
                        <Download className="h-4 w-4 mr-2" />
                        주문 다운로드
                        {orderDownloadPath && <FolderOpen className="h-3 w-3 ml-1 text-primary" />}
                      </Button>
                    </TooltipTrigger>
                    {orderDownloadPath && (
                      <TooltipContent>
                        <p>기본 폴더: {orderDownloadPath}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={handleUploadWithPicker} disabled={isPending}>
                        <Upload className="h-4 w-4 mr-2" />
                        운송장 업로드
                        {trackingUploadPath && <FolderOpen className="h-3 w-3 ml-1 text-primary" />}
                      </Button>
                    </TooltipTrigger>
                    {trackingUploadPath && (
                      <TooltipContent>
                        <p>기본 폴더: {trackingUploadPath}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {selectedIds.length > 0 && (
                  <Button onClick={handleBulkSaveTracking} disabled={isPending}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
                    {selectedIds.length}건 일괄 저장
                  </Button>
                )}
              </>
            )}

            {currentStep === 2 && selectedIds.length > 0 && (
              <Button onClick={handleDispatchToNaver} disabled={isPending}>
                <Send className={cn('h-4 w-4 mr-2', isPending && 'animate-pulse')} />
                {testMode ? '[테스트] ' : ''}네이버 발송처리 ({selectedIds.length}건)
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateTestOrders} disabled={isPending}>
              <FlaskConical className="h-4 w-4 mr-2" />
              테스트 주문 생성
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteTestOrders} disabled={isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              테스트 주문 삭제
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base font-semibold">
              {currentStep === 1 ? '운송장 입력 대기' : currentStep === 2 ? '발송 대기 목록' : '발송 완료 목록'}
              <span className="text-muted-foreground font-normal ml-2">({currentOrders.length}건)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {currentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {currentStep === 1 ? '운송장 입력 대기 중인 주문이 없습니다' : 
                   currentStep === 2 ? '발송 대기 중인 주문이 없습니다' :
                   '발송 완료된 주문이 없습니다'}
                </h3>
                <p className="text-muted-foreground">
                  {currentStep === 1 ? '새 주문이 들어오면 여기에 표시됩니다.' : 
                   currentStep === 2 ? '운송장을 입력하면 여기에 표시됩니다.' :
                   '네이버 발송처리가 완료되면 여기에 표시됩니다.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentStep !== 3 && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.length === currentOrders.length && currentOrders.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">주문번호</TableHead>
                      <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">상품</TableHead>
                      <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">수령인</TableHead>
                      <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">주소</TableHead>
                      <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">금액</TableHead>
                      {currentStep === 1 && (
                        <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">운송장 입력</TableHead>
                      )}
                      {currentStep >= 2 && (
                        <TableHead className="text-xs font-semibold uppercase whitespace-nowrap">운송장번호</TableHead>
                      )}
                      {currentStep === 1 && (
                        <TableHead className="w-20"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrders.map(order => (
                      <TableRow key={order.id}>
                        {currentStep !== 3 && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(order.id)}
                              onCheckedChange={(checked) => handleSelectOne(order.id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {order.platformOrderId.startsWith('TEST-') ? (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                              {order.platformOrderId}
                            </Badge>
                          ) : (
                            order.platformOrderId
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{order.productName}</p>
                            {order.productOption && (
                              <p className="text-xs text-muted-foreground truncate">{order.productOption}</p>
                            )}
                            <p className="text-xs text-muted-foreground">수량: {order.quantity}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium">{order.receiverName || order.customerName}</p>
                            <p className="text-xs text-muted-foreground">{order.receiverTel}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px]">
                            <p className="text-sm truncate">{order.receiverAddress}</p>
                            {order.zipCode && (
                              <p className="text-xs text-muted-foreground">[{order.zipCode}]</p>
                            )}
                            {order.deliveryMemo && (
                              <p className="text-xs text-orange-500 truncate">{order.deliveryMemo}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatPrice(order.totalAmount)}
                        </TableCell>
                        {currentStep === 1 && (
                          <TableCell>
                            <Input
                              value={trackingInputs[order.id] || ''}
                              onChange={(e) => handleTrackingInput(order.id, e.target.value)}
                              placeholder="운송장번호"
                              className="w-[180px]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTracking(order.id)
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        {currentStep >= 2 && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {order.trackingNumber}
                              </Badge>
                              {order.courierCode && (
                                <span className="text-xs text-muted-foreground">
                                  {couriers.find(c => c.code === order.courierCode)?.name || order.courierCode}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {currentStep === 1 && (
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSaveTracking(order.id)}
                              disabled={isPending || !trackingInputs[order.id]?.trim()}
                            >
                              저장
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {testMode ? '[테스트] ' : ''}네이버 발송처리 결과
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {dispatchResults.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">처리 중...</span>
              </div>
            ) : (
              dispatchResults.map((result, idx) => {
                const order = orders.find(o => o.id === result.orderId)
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      result.success ? 'bg-green-500/10' : 'bg-destructive/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{order?.platformOrderId}</p>
                        <p className="text-xs text-muted-foreground">{order?.productName}</p>
                      </div>
                    </div>
                    {result.error && (
                      <p className="text-xs text-destructive max-w-[200px] truncate">{result.error}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDispatchDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
