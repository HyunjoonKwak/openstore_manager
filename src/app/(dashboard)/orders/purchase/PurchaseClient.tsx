'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Send, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  sendSupplierOrder,
  type SupplierOrderGroup,
} from '@/lib/actions/market-supplier-orders'

// Supplier purchase orders. Preview shows the actual outgoing message
// and the exact item list; sending requires the confirm step. Mobile
// supports approval — one primary action per card.

export function PurchaseClient({ initialGroups }: { initialGroups: SupplierOrderGroup[] }) {
  const router = useRouter()
  const [confirmTarget, setConfirmTarget] = useState<SupplierOrderGroup | null>(null)
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!confirmTarget) return
    setIsSending(true)
    try {
      const result = await sendSupplierOrder({
        supplierId: confirmTarget.supplierId,
        orderItemIds: confirmTarget.items.map((item) => item.orderItemId),
      })
      if (result.data) {
        if (result.data.notificationSent) {
          toast.success(`${confirmTarget.supplierName}에 ${result.data.sentCount}건 발주를 전송했습니다.`)
        } else {
          toast.warning(
            `${result.data.sentCount}건 발주 처리됨 — 알림 전송 실패`,
            { description: result.data.notificationError }
          )
        }
        setConfirmTarget(null)
        router.refresh()
      } else {
        toast.error(result.error || '발주 전송에 실패했습니다.')
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <Header title="공급업체 발주" subtitle="Purchase Orders" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        {initialGroups.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Truck className="mx-auto mb-3 h-10 w-10" />
            <p className="mb-1 font-medium">발주 대기 중인 주문이 없습니다</p>
            <p className="text-sm">
              공급업체가 연결된 상품의 신규 주문이 들어오면 여기에 모입니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {initialGroups.map((group) => (
              <Card key={group.supplierId} className="py-0">
                <CardHeader className="border-b border-border py-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {group.supplierName}
                      <Badge variant="secondary" className="text-[10px]">
                        {group.contactMethod}
                      </Badge>
                      {!group.hasContact && (
                        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-[10px] text-warning">
                          연락처 없음
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {group.items.length}건
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="max-h-44 space-y-1 overflow-y-auto">
                    {group.items.map((item) => (
                      <div key={item.orderItemId} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          {item.productName}
                          {item.optionName && (
                            <span className="text-muted-foreground"> ({item.optionName})</span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={() => setConfirmTarget(group)}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {group.items.length}건 발주 미리보기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {confirmTarget?.supplierName}에 {confirmTarget?.items.length}건을 발주합니다
            </DialogTitle>
            <DialogDescription>
              아래 메시지가 {confirmTarget?.contactMethod}(으)로 전송되고, 항목들이 발주 완료로
              표시됩니다.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 rounded-md border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {confirmTarget?.messagePreview}
            </pre>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={isSending}>
              취소
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}✓{' '}
              {confirmTarget?.items.length}건 발주 전송
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
