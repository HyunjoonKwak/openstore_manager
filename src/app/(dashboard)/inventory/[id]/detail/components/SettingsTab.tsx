'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

const TAX_TYPES = [
  { value: 'TAX', label: '과세' },
  { value: 'DUTYFREE', label: '면세' },
  { value: 'ZERO', label: '영세' },
]

interface SettingsTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function SettingsTab({ productData, updateField }: SettingsTabProps) {
  return (
    <TabsContent value="settings" className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">판매 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="detail-tax-type">부가세</Label>
              <Select value={productData.taxType || 'TAX'} onValueChange={(v) => updateField('taxType', v)}>
                <SelectTrigger id="detail-tax-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="detail-minor-purchasable">미성년자 구매 가능</Label>
                <p className="text-xs text-muted-foreground">만 19세 미만 구매 허용</p>
              </div>
              <Switch id="detail-minor-purchasable" checked={productData.minorPurchasable || false} onCheckedChange={(checked) => updateField('minorPurchasable', checked)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">구매 수량 제한</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail-min-purchase-quantity">최소 수량</Label>
                <Input id="detail-min-purchase-quantity" type="number" value={productData.minPurchaseQuantity || ''} onChange={(e) => updateField('minPurchaseQuantity', Number(e.target.value) || undefined)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-max-purchase-per-id">1인당 최대</Label>
                <Input id="detail-max-purchase-per-id" type="number" value={productData.maxPurchaseQuantityPerId || ''} onChange={(e) => updateField('maxPurchaseQuantityPerId', Number(e.target.value) || undefined)} placeholder="무제한" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-max-purchase-per-order">1회 최대</Label>
                <Input id="detail-max-purchase-per-order" type="number" value={productData.maxPurchaseQuantityPerOrder || ''} onChange={(e) => updateField('maxPurchaseQuantityPerOrder', Number(e.target.value) || undefined)} placeholder="무제한" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">판매 기간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail-sale-start-date">시작일</Label>
                <Input id="detail-sale-start-date" type="date" value={productData.saleStartDate?.split('T')[0] || ''} onChange={(e) => updateField('saleStartDate', e.target.value ? `${e.target.value}T00:00:00` : undefined)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-sale-end-date">종료일</Label>
                <Input id="detail-sale-end-date" type="date" value={productData.saleEndDate?.split('T')[0] || ''} onChange={(e) => updateField('saleEndDate', e.target.value ? `${e.target.value}T23:59:59` : undefined)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}
