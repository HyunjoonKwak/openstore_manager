'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Copy, Check, FileDown, Printer, ArrowLeft, Package } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import {
  generateOrderMessage,
  markOrdersAsOrdered,
  type OrderForSupplier,
  type SupplierForOrder,
} from '@/lib/actions/supplier-orders'

interface Props {
  orders: OrderForSupplier[]
  suppliers: SupplierForOrder[]
}

export default function SendToSupplierClient({ orders, suppliers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers[0]?.id || ''
  )
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId)

  const filteredOrders = useMemo(() => {
    if (!selectedSupplierId) return orders
    return orders.filter(
      (o) => o.supplierId === selectedSupplierId || !o.supplierId
    )
  }, [orders, selectedSupplierId])

  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((o) => selectedOrderIds.has(o.id))
  }, [filteredOrders, selectedOrderIds])

  const totalItems = selectedOrders.reduce((sum, o) => sum + o.quantity, 0)

  const supplierOrderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    orders.forEach((order) => {
      const supplierId = order.supplierId || 'unassigned'
      counts.set(supplierId, (counts.get(supplierId) || 0) + 1)
    })
    return counts
  }, [orders])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)))
    } else {
      setSelectedOrderIds(new Set())
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrderIds(newSelected)
  }

  const handleGenerateMessage = async () => {
    if (!selectedSupplier || selectedOrders.length === 0) {
      toast.error('공급사와 주문을 선택해주세요.')
      return
    }

    const generatedMessage = await generateOrderMessage(selectedOrders, selectedSupplier)
    setMessage(generatedMessage)
    toast.success('발주 메시지가 생성되었습니다.')
  }

  const handleCopy = async () => {
    if (!message) {
      toast.error('먼저 메시지를 생성해주세요.')
      return
    }
    await navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('메시지가 클립보드에 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    if (!message) {
      toast.error('먼저 메시지를 생성해주세요.')
      return
    }

    handleCopy()

    startTransition(async () => {
      const orderIds = Array.from(selectedOrderIds)
      const result = await markOrdersAsOrdered(orderIds)

      if (result.success) {
        toast.success(
          selectedSupplier?.contactMethod === 'Kakao'
            ? '카카오톡으로 이동합니다. 메시지를 붙여넣기 해주세요.'
            : 'SMS 앱으로 이동합니다. 메시지를 붙여넣기 해주세요.'
        )
        router.refresh()
      } else {
        toast.error(result.error || '상태 업데이트에 실패했습니다.')
      }
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-bold">주문 목록</CardTitle>
                  <Badge variant="secondary">{filteredOrders.length}건</Badge>
                </div>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  CSV 내보내기
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            filteredOrders.length > 0 &&
                            selectedOrderIds.size === filteredOrders.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase">주문번호</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">상품</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">SKU</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-center">
                        수량
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase">주문일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOrder(order.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          #{order.platformOrderId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                              {order.productSku.slice(0, 2)}
                            </div>
                            <span className="text-sm truncate max-w-[200px]">
                              {order.productName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {order.productSku}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">x{order.quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/30">
                  <span className="text-sm text-muted-foreground">
                    {selectedOrderIds.size}건 선택됨
                  </span>
                  <div className="flex gap-4 text-sm">
                    <span>
                      총 수량: <strong>{totalItems}개</strong>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-lg font-bold">전송 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    공급업체
                  </Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="공급업체 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{supplier.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {supplierOrderCounts.get(supplier.id) || 0}건
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSupplier && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      연락처 ({selectedSupplier.contactMethod})
                    </Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Badge variant="outline" className="text-xs">
                        {selectedSupplier.contactMethod === 'Kakao' ? 'K' : 'SMS'}
                      </Badge>
                      <span className="font-mono text-sm">
                        {selectedSupplier.contactNumber || '연락처 없음'}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateMessage}
                  disabled={selectedOrderIds.size === 0 || !selectedSupplier}
                >
                  메시지 생성
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
                <CardTitle className="text-base font-semibold">메시지 미리보기</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!message}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="메시지 생성 버튼을 클릭하여 발주 메시지를 생성하세요."
                  className="min-h-[200px] font-mono text-sm bg-muted resize-none"
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleSend}
                disabled={isPending || !message || selectedOrderIds.size === 0}
              >
                <Send className="h-5 w-5 mr-2" />
                {isPending
                  ? '처리 중...'
                  : selectedSupplier?.contactMethod === 'Kakao'
                  ? '카카오톡으로 전송'
                  : 'SMS로 전송'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopy}
                  disabled={!message}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  텍스트 복사
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  목록 인쇄
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
