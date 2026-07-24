'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TabsContent } from '@/components/ui/tabs'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

interface SeoTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function SeoTab({ productData, updateField }: SeoTabProps) {
  return (
    <TabsContent value="seo" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">검색 최적화 (SEO)</CardTitle>
          <CardDescription>네이버 검색 노출을 위한 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>페이지 제목</Label>
            <Input value={productData.seoPageTitle || ''} onChange={(e) => updateField('seoPageTitle', e.target.value)} placeholder="검색 결과에 표시될 제목" />
            <p className="text-xs text-muted-foreground">{productData.seoPageTitle?.length || 0}/100자</p>
          </div>
          <div className="space-y-2">
            <Label>메타 설명</Label>
            <Textarea value={productData.seoMetaDescription || ''} onChange={(e) => updateField('seoMetaDescription', e.target.value)} placeholder="검색 결과에 표시될 설명" className="min-h-[100px]" />
            <p className="text-xs text-muted-foreground">{productData.seoMetaDescription?.length || 0}/200자</p>
          </div>
          <div className="space-y-2">
            <Label>태그</Label>
            <div className="flex flex-wrap gap-2">
              {productData.sellerTags?.map((tag, idx) => (
                <Badge key={idx} variant="secondary">{tag.text}</Badge>
              ))}
              {(!productData.sellerTags || productData.sellerTags.length === 0) && (
                <p className="text-sm text-muted-foreground">등록된 태그가 없습니다.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
