'use client'

import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

const PRODUCT_INFO_NOTICE_TYPES = [
  { value: 'WEAR', label: '의류' },
  { value: 'SHOES', label: '신발' },
  { value: 'BAG', label: '가방' },
  { value: 'FASHION_ITEMS', label: '패션잡화' },
  { value: 'SLEEPING_GEAR', label: '침구류' },
  { value: 'FURNITURE', label: '가구' },
  { value: 'IMAGE_APPLIANCES', label: '영상가전' },
  { value: 'HOME_APPLIANCES', label: '가정용 전기제품' },
  { value: 'SEASON_APPLIANCES', label: '계절가전' },
  { value: 'OFFICE_APPLIANCES', label: '사무용기기' },
  { value: 'OPTICS_APPLIANCES', label: '광학기기' },
  { value: 'MICROELECTRONICS', label: '소형전자' },
  { value: 'CELLPHONE', label: '휴대폰' },
  { value: 'NAVIGATION', label: '내비게이션' },
  { value: 'CAR_ARTICLES', label: '자동차용품' },
  { value: 'MEDICAL_APPLIANCES', label: '의료기기' },
  { value: 'KITCHEN_UTENSILS', label: '주방용품' },
  { value: 'COSMETIC', label: '화장품' },
  { value: 'JEWELLERY', label: '귀금속/보석' },
  { value: 'FOOD', label: '식품' },
  { value: 'GENERAL_FOOD', label: '가공식품' },
  { value: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
  { value: 'KIDS', label: '어린이제품' },
  { value: 'SPORTS_EQUIPMENT', label: '스포츠용품' },
  { value: 'BOOKS', label: '서적' },
  { value: 'RENTAL_ETC', label: '물품대여(기타)' },
  { value: 'DIGITAL_CONTENTS', label: '디지털콘텐츠' },
  { value: 'GIFT_CARD', label: '상품권' },
  { value: 'BIOPHARMACEUTICAL', label: '생활화학제품' },
  { value: 'ETC', label: '기타' },
]

interface NoticeTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function NoticeTab({ productData, updateField }: NoticeTabProps) {
  return (
    <TabsContent value="notice" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상품정보제공고시</CardTitle>
          <CardDescription>상품 유형에 따른 필수 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="detail-notice-type">상품 유형</Label>
            <Select value={productData.productInfoProvidedNotice?.productInfoProvidedNoticeType || 'ETC'} onValueChange={(v) => updateField('productInfoProvidedNotice', { ...productData.productInfoProvidedNotice, productInfoProvidedNoticeType: v })}>
              <SelectTrigger id="detail-notice-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_INFO_NOTICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                상품정보제공고시 세부 항목은 상품 유형에 따라 다릅니다.
                현재는 스마트스토어 센터에서 직접 수정해주세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
