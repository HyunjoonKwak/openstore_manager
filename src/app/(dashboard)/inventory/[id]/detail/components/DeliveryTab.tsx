'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

const DELIVERY_FEE_TYPES = [
  { value: 'FREE', label: '무료배송' },
  { value: 'PAID', label: '유료배송' },
  { value: 'CONDITIONAL_FREE', label: '조건부 무료' },
  { value: 'QUANTITY_PAID', label: '수량별 부과' },
]

interface DeliveryTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function DeliveryTab({ productData, updateField }: DeliveryTabProps) {
  return (
    <TabsContent value="delivery" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">배송/반품 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>배송비 유형</Label>
                <Select value={productData.deliveryFeeType || 'PAID'} onValueChange={(v) => updateField('deliveryFeeType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_FEE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {productData.deliveryFeeType !== 'FREE' && (
                <div className="space-y-2">
                  <Label>기본 배송비</Label>
                  <Input type="number" value={productData.baseFee || 0} onChange={(e) => updateField('baseFee', Number(e.target.value))} />
                </div>
              )}
              {productData.deliveryFeeType === 'CONDITIONAL_FREE' && (
                <div className="space-y-2">
                  <Label>무료배송 기준금액</Label>
                  <Input type="number" value={productData.freeConditionalAmount || 0} onChange={(e) => updateField('freeConditionalAmount', Number(e.target.value))} />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>반품 배송비 (편도)</Label>
                <Input type="number" value={productData.returnDeliveryFee || 0} onChange={(e) => updateField('returnDeliveryFee', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>교환 배송비 (왕복)</Label>
                <Input type="number" value={productData.exchangeDeliveryFee || 0} onChange={(e) => updateField('exchangeDeliveryFee', Number(e.target.value))} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
