'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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

interface BenefitTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
  formatCurrency: (value: number) => string
}

export function BenefitTab({ productData, updateField, formatCurrency }: BenefitTabProps) {
  return (
    <TabsContent value="benefit" className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">할인 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail-discount-value">할인 금액/률</Label>
                <Input id="detail-discount-value" type="number" value={productData.discountValue || 0} onChange={(e) => updateField('discountValue', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-discount-unit-type">단위</Label>
                <Select value={productData.discountUnitType || 'WON'} onValueChange={(v) => updateField('discountUnitType', v)}>
                  <SelectTrigger id="detail-discount-unit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WON">원</SelectItem>
                    <SelectItem value="PERCENT">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Explicit null/zero check: a discount of 0 renders nothing (avoids stray "0") */}
            {productData.discountValue != null && productData.discountValue > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  할인 적용가: {formatCurrency(
                    productData.discountUnitType === 'PERCENT'
                      ? productData.salePrice * (1 - productData.discountValue / 100)
                      : productData.salePrice - productData.discountValue
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">포인트/적립</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-point-value">구매 적립</Label>
                <Input id="detail-purchase-point-value" type="number" value={productData.purchasePointValue || 0} onChange={(e) => updateField('purchasePointValue', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-point-unit-type">단위</Label>
                <Select value={productData.purchasePointUnitType || 'WON'} onValueChange={(v) => updateField('purchasePointUnitType', v)}>
                  <SelectTrigger id="detail-purchase-point-unit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WON">원</SelectItem>
                    <SelectItem value="PERCENT">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail-text-review-point">텍스트 리뷰 포인트</Label>
                <Input id="detail-text-review-point" type="number" value={productData.textReviewPoint || 0} onChange={(e) => updateField('textReviewPoint', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-photo-video-review-point">포토/동영상 리뷰 포인트</Label>
                <Input id="detail-photo-video-review-point" type="number" value={productData.photoVideoReviewPoint || 0} onChange={(e) => updateField('photoVideoReviewPoint', Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">사은품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="detail-gift-name">사은품명</Label>
              <Input id="detail-gift-name" value={productData.giftName || ''} onChange={(e) => updateField('giftName', e.target.value)} placeholder="구매 시 증정되는 사은품" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">이벤트 문구</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="detail-event-phrase-enabled">이벤트 문구 사용</Label>
              <Switch id="detail-event-phrase-enabled" checked={productData.eventPhraseEnabled || false} onCheckedChange={(checked) => updateField('eventPhraseEnabled', checked)} />
            </div>
            {productData.eventPhraseEnabled && (
              <div className="space-y-2">
                <Label htmlFor="detail-event-phrase-content">문구 내용</Label>
                <Input id="detail-event-phrase-content" value={productData.eventPhraseContent || ''} onChange={(e) => updateField('eventPhraseContent', e.target.value)} placeholder="예: 오늘만 50% 할인!" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}
