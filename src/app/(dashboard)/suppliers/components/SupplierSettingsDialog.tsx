'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Truck, Clock, FileText, Info, Send, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import type { CourierData } from '@/lib/actions/couriers'

export const DEFAULT_TEMPLATE = `[발주서] {date}

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

export interface SupplierSettingsData {
  messageTemplate: string
  sendScheduleTime: string
  sendScheduleEnabled: boolean
  autoSendEnabled: boolean
  courierId: string
  defaultCourierAccount: string
}

interface SupplierSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settingsSupplier: SupplierWithStats | null
  settingsData: SupplierSettingsData
  setSettingsData: Dispatch<SetStateAction<SupplierSettingsData>>
  couriers: CourierData[]
  showPreview: boolean
  setShowPreview: (show: boolean) => void
  isSendingTest: boolean
  handleSendTest: () => void
  handleSaveSettings: () => void
  isPending: boolean
}

const renderPreview = (template: string, supplierName: string): string => {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return template
    .replace(/{supplier_name}/g, supplierName)
    .replace(/{date}/g, today)
    .replace(/{order_count}/g, '3')
    .replace(/{total_quantity}/g, '7')
    .replace(/{total_amount}/g, '150,000')
    .replace(/{order_list}/g, '- 테스트 상품A (옵션1) x3\n- 테스트 상품B x2\n- 테스트 상품C (Large) x2')
    .replace(/{receiver_list}/g, '1. 홍길동 / 010-1234-5678\n   서울시 강남구 테헤란로 123\n2. 김철수 / 010-9876-5432\n   부산시 해운대구 해변로 456')
}

export function SupplierSettingsDialog({
  open,
  onOpenChange,
  settingsSupplier,
  settingsData,
  setSettingsData,
  couriers,
  showPreview,
  setShowPreview,
  isSendingTest,
  handleSendTest,
  handleSaveSettings,
  isPending,
}: SupplierSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {settingsSupplier?.name} 설정
          </DialogTitle>
          <DialogDescription>
            발주 메시지 템플릿과 발송 방법을 설정하세요.
          </DialogDescription>
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

            {showPreview ? (
              <div className="min-h-[200px] p-3 bg-muted/30 rounded-md border">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {renderPreview(settingsData.messageTemplate || DEFAULT_TEMPLATE, settingsSupplier?.name || '공급업체')}
                </pre>
              </div>
            ) : (
              <Textarea
                id="messageTemplate"
                value={settingsData.messageTemplate}
                onChange={(e) =>
                  setSettingsData((prev) => ({ ...prev, messageTemplate: e.target.value }))
                }
                className="min-h-[200px] font-mono text-sm"
                placeholder={DEFAULT_TEMPLATE}
              />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>변수 버튼을 클릭하면 커서 위치에 삽입됩니다</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showPreview ? '편집' : '미리보기'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                >
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  테스트 발송
                </Button>
              </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSaveSettings} disabled={isPending}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
