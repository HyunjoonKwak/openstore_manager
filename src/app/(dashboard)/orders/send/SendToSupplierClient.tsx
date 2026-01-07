'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Copy, Check, FileDown, ArrowLeft, Package, Bell, ChevronDown, ChevronRight, Settings, Clock, Users } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  generateOrderMessage,
  sendOrdersToSupplier,
  checkNotificationConfig,
  type OrderForSupplier,
  type SupplierForOrder,
} from '@/lib/actions/supplier-orders'
import { updateSupplier } from '@/lib/actions/suppliers'

interface Props {
  orders: OrderForSupplier[]
  suppliers: SupplierForOrder[]
}

interface SupplierGroup {
  supplier: SupplierForOrder | null
  orders: OrderForSupplier[]
  isOpen: boolean
  selectedIds: Set<string>
}

export default function SendToSupplierClient({ orders, suppliers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [sendNotification, setSendNotification] = useState(true)
  const [notificationConfig, setNotificationConfig] = useState<{
    smsConfigured: boolean
    kakaoConfigured: boolean
  } | null>(null)
  
  const [supplierGroups, setSupplierGroups] = useState<Map<string, SupplierGroup>>(new Map())
  const [activeSupplier, setActiveSupplier] = useState<string | null>(null)
  const [generatedMessages, setGeneratedMessages] = useState<Map<string, string>>(new Map())
  
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templateDraft, setTemplateDraft] = useState('')
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [scheduleEnabledDraft, setScheduleEnabledDraft] = useState(false)

  useEffect(() => {
    checkNotificationConfig()
      .then(setNotificationConfig)
      .catch(() => setNotificationConfig(null))
  }, [])

  useEffect(() => {
    const groups = new Map<string, SupplierGroup>()
    
    const unassignedOrders: OrderForSupplier[] = []
    const supplierOrdersMap = new Map<string, OrderForSupplier[]>()
    
    orders.forEach((order) => {
      if (order.supplierId) {
        const existing = supplierOrdersMap.get(order.supplierId) || []
        existing.push(order)
        supplierOrdersMap.set(order.supplierId, existing)
      } else {
        unassignedOrders.push(order)
      }
    })
    
    suppliers.forEach((supplier) => {
      const supplierOrders = supplierOrdersMap.get(supplier.id) || []
      groups.set(supplier.id, {
        supplier,
        orders: supplierOrders,
        isOpen: supplierOrders.length > 0,
        selectedIds: new Set(supplierOrders.map(o => o.id)),
      })
    })
    
    if (unassignedOrders.length > 0) {
      groups.set('unassigned', {
        supplier: null,
        orders: unassignedOrders,
        isOpen: true,
        selectedIds: new Set(),
      })
    }
    
    setSupplierGroups(groups)
  }, [orders, suppliers])

  const toggleGroup = (supplierId: string) => {
    setSupplierGroups(prev => {
      const newGroups = new Map(prev)
      const group = newGroups.get(supplierId)
      if (group) {
        newGroups.set(supplierId, { ...group, isOpen: !group.isOpen })
      }
      return newGroups
    })
  }

  const toggleOrderSelection = (supplierId: string, orderId: string, checked: boolean) => {
    setSupplierGroups(prev => {
      const newGroups = new Map(prev)
      const group = newGroups.get(supplierId)
      if (group) {
        const newSelectedIds = new Set(group.selectedIds)
        if (checked) {
          newSelectedIds.add(orderId)
        } else {
          newSelectedIds.delete(orderId)
        }
        newGroups.set(supplierId, { ...group, selectedIds: newSelectedIds })
      }
      return newGroups
    })
  }

  const toggleAllInGroup = (supplierId: string, checked: boolean) => {
    setSupplierGroups(prev => {
      const newGroups = new Map(prev)
      const group = newGroups.get(supplierId)
      if (group) {
        const newSelectedIds = checked 
          ? new Set(group.orders.map(o => o.id))
          : new Set<string>()
        newGroups.set(supplierId, { ...group, selectedIds: newSelectedIds })
      }
      return newGroups
    })
  }

  const handleGenerateMessage = async (supplierId: string) => {
    const group = supplierGroups.get(supplierId)
    if (!group || !group.supplier || group.selectedIds.size === 0) {
      toast.error('주문을 선택해주세요.')
      return
    }

    const selectedOrders = group.orders.filter(o => group.selectedIds.has(o.id))
    
    let message: string
    if (group.supplier.messageTemplate) {
      message = formatMessageFromTemplate(group.supplier.messageTemplate, selectedOrders, group.supplier)
    } else {
      message = await generateOrderMessage(selectedOrders, group.supplier)
    }
    
    setGeneratedMessages(prev => new Map(prev).set(supplierId, message))
    setActiveSupplier(supplierId)
    toast.success('발주 메시지가 생성되었습니다.')
  }

  const formatMessageFromTemplate = (
    template: string, 
    selectedOrders: OrderForSupplier[], 
    supplier: SupplierForOrder
  ): string => {
    const orderLines = selectedOrders.map(o => 
      `- ${o.productName}${o.productOption ? ` (${o.productOption})` : ''} x${o.quantity}`
    ).join('\n')
    
    const receiverLines = selectedOrders.map((o, i) => {
      const name = o.receiverName || o.customerName || '정보없음'
      const address = o.customerAddress || ''
      return `${i + 1}. ${name}\n   ${address}`
    }).join('\n')
    
    const totalQty = selectedOrders.reduce((sum, o) => sum + o.quantity, 0)
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const date = new Date().toLocaleDateString('ko-KR')
    
    return template
      .replace(/\{supplier_name\}/g, supplier.name)
      .replace(/\{order_count\}/g, String(selectedOrders.length))
      .replace(/\{total_quantity\}/g, String(totalQty))
      .replace(/\{total_amount\}/g, totalAmount.toLocaleString())
      .replace(/\{order_list\}/g, orderLines)
      .replace(/\{receiver_list\}/g, receiverLines)
      .replace(/\{date\}/g, date)
  }

  const handleCopy = async (supplierId: string) => {
    const message = generatedMessages.get(supplierId)
    if (!message) {
      toast.error('먼저 메시지를 생성해주세요.')
      return
    }
    await navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('메시지가 클립보드에 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = (supplierId: string) => {
    const group = supplierGroups.get(supplierId)
    if (!group || !group.supplier || group.selectedIds.size === 0) {
      toast.error('공급업체와 주문을 선택해주세요.')
      return
    }

    startTransition(async () => {
      const orderIds = Array.from(group.selectedIds)
      const result = await sendOrdersToSupplier(
        group.supplier!.id,
        orderIds,
        sendNotification && !!group.supplier!.contactNumber
      )

      if (result.success) {
        if (result.notificationSent) {
          toast.success(
            `${result.orderCount}건의 주문이 전송되었습니다. ${result.notificationMethod} 알림이 발송되었습니다.`
          )
        } else if (sendNotification && group.supplier!.contactNumber) {
          toast.warning(
            `${result.orderCount}건의 주문이 전송되었습니다. 알림 발송 실패: ${result.notificationError || '알 수 없는 오류'}`
          )
          handleCopy(supplierId)
        } else {
          toast.success(`${result.orderCount}건의 주문이 전송되었습니다.`)
          handleCopy(supplierId)
        }
        router.refresh()
      } else {
        toast.error(result.error || '주문 전송에 실패했습니다.')
      }
    })
  }

  const handleSendAll = () => {
    let sentCount = 0
    supplierGroups.forEach((group, supplierId) => {
      if (group.supplier && group.selectedIds.size > 0) {
        handleSend(supplierId)
        sentCount++
      }
    })
    if (sentCount === 0) {
      toast.error('전송할 주문이 없습니다.')
    }
  }

  const handleSaveTemplate = async (supplierId: string) => {
    const result = await updateSupplier({
      id: supplierId,
      messageTemplate: templateDraft || null,
      sendScheduleTime: scheduleDraft || null,
      sendScheduleEnabled: scheduleEnabledDraft,
    })
    
    if (result.success) {
      toast.success('설정이 저장되었습니다.')
      setEditingTemplate(null)
      router.refresh()
    } else {
      toast.error(result.error || '저장에 실패했습니다.')
    }
  }

  const openTemplateDialog = (supplier: SupplierForOrder) => {
    setEditingTemplate(supplier.id)
    setTemplateDraft(supplier.messageTemplate || defaultTemplate)
    setScheduleDraft(supplier.sendScheduleTime || '')
    setScheduleEnabledDraft(supplier.sendScheduleEnabled || false)
  }

  const defaultTemplate = `[발주서] {date}

{supplier_name} 담당자님께

금일 발주 내역을 전달드립니다.

{order_list}

총 {order_count}건, {total_quantity}개

확인 부탁드립니다.
감사합니다.`

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalOrderCount = orders.length
  const totalSupplierCount = suppliers.filter(s => 
    supplierGroups.get(s.id)?.orders.length ?? 0 > 0
  ).length

  if (orders.length === 0) {
    return (
      <>
        <Header title="공급업체 전송" subtitle="Send to Supplier" />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">발주할 주문이 없습니다</h3>
              <p className="text-muted-foreground text-center mb-4">
                신규 주문이 들어오면 이곳에서 공급사에게 발주할 수 있습니다.
              </p>
              <Button variant="outline" onClick={() => router.push('/orders')}>
                주문 목록으로 이동
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="공급업체 전송" subtitle="Send to Supplier" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{totalSupplierCount}개 업체</span>
              <span>•</span>
              <Package className="h-4 w-4" />
              <span>{totalOrderCount}건</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={sendNotification}
                onCheckedChange={setSendNotification}
                disabled={!notificationConfig?.smsConfigured && !notificationConfig?.kakaoConfigured}
              />
              <span className="text-sm">알림 발송</span>
            </div>
            
            <Button onClick={handleSendAll} disabled={isPending}>
              <Send className="h-4 w-4 mr-2" />
              전체 전송
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from(supplierGroups.entries()).map(([supplierId, group]) => (
            <Card key={supplierId}>
              <Collapsible open={group.isOpen} onOpenChange={() => toggleGroup(supplierId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {group.isOpen ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {group.supplier?.name || '미지정 주문'}
                          </CardTitle>
                          {group.supplier && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {group.supplier.contactMethod}
                              </Badge>
                              <span>{group.supplier.contactNumber || '연락처 없음'}</span>
                              {group.supplier.sendScheduleEnabled && group.supplier.sendScheduleTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  매일 {group.supplier.sendScheduleTime}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="secondary">
                          {group.selectedIds.size}/{group.orders.length}건 선택
                        </Badge>
                        
                        {group.supplier && (
                          <Dialog open={editingTemplate === supplierId} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openTemplateDialog(group.supplier!)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{group.supplier.name} 설정</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>메시지 템플릿</Label>
                                  <Textarea
                                    value={templateDraft}
                                    onChange={(e) => setTemplateDraft(e.target.value)}
                                    className="min-h-[200px] font-mono text-sm"
                                    placeholder={defaultTemplate}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    사용 가능 변수: {'{supplier_name}'}, {'{order_count}'}, {'{total_quantity}'}, {'{order_list}'}, {'{date}'}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 space-y-2">
                                    <Label>자동 전송 시간</Label>
                                    <Input
                                      type="time"
                                      value={scheduleDraft}
                                      onChange={(e) => setScheduleDraft(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pt-6">
                                    <Switch
                                      checked={scheduleEnabledDraft}
                                      onCheckedChange={setScheduleEnabledDraft}
                                    />
                                    <Label>활성화</Label>
                                  </div>
                                </div>
                                
                                <Button onClick={() => handleSaveTemplate(supplierId)} className="w-full">
                                  저장
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {group.supplier && group.orders.length > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateMessage(supplierId)}
                              disabled={group.selectedIds.size === 0}
                            >
                              메시지 생성
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSend(supplierId)}
                              disabled={isPending || group.selectedIds.size === 0}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              전송
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="p-0 border-t">
                    {group.orders.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        이 공급업체에 연결된 주문이 없습니다.
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={group.selectedIds.size === group.orders.length}
                                  onCheckedChange={(checked) => toggleAllInGroup(supplierId, checked as boolean)}
                                />
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase">주문번호</TableHead>
                              <TableHead className="text-xs font-semibold uppercase">상품</TableHead>
                              <TableHead className="text-xs font-semibold uppercase">옵션</TableHead>
                              <TableHead className="text-xs font-semibold uppercase text-center">수량</TableHead>
                              <TableHead className="text-xs font-semibold uppercase">수령인</TableHead>
                              <TableHead className="text-xs font-semibold uppercase">주문일</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.orders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={group.selectedIds.has(order.id)}
                                    onCheckedChange={(checked) =>
                                      toggleOrderSelection(supplierId, order.id, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm text-primary">
                                  #{order.platformOrderId?.slice(-8)}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm truncate max-w-[200px] block">
                                    {order.productName}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {order.productOption || '-'}
                                </TableCell>
                                <TableCell className="text-center font-medium">x{order.quantity}</TableCell>
                                <TableCell className="text-sm">
                                  {order.receiverName || order.customerName}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(order.orderDate)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        {activeSupplier === supplierId && generatedMessages.has(supplierId) && (
                          <div className="p-4 border-t bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium">생성된 메시지</Label>
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(supplierId)}>
                                {copied ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <Textarea
                              value={generatedMessages.get(supplierId) || ''}
                              onChange={(e) => {
                                setGeneratedMessages(prev => new Map(prev).set(supplierId, e.target.value))
                              }}
                              className="min-h-[150px] font-mono text-sm bg-background"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
