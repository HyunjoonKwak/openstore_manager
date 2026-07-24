'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TabsContent } from '@/components/ui/tabs'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

interface ServiceTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function ServiceTab({ productData, updateField }: ServiceTabProps) {
  return (
    <TabsContent value="service" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">A/S 및 고객 서비스</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="detail-after-service-tel">A/S 전화번호</Label>
            <Input id="detail-after-service-tel" value={productData.afterServiceTel || ''} onChange={(e) => updateField('afterServiceTel', e.target.value)} placeholder="02-1234-5678" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-after-service-guide">A/S 안내</Label>
            <Textarea id="detail-after-service-guide" value={productData.afterServiceGuide || ''} onChange={(e) => updateField('afterServiceGuide', e.target.value)} placeholder="A/S 관련 안내사항..." className="min-h-[150px]" />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
