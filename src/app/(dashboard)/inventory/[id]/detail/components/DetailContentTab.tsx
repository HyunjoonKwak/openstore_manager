'use client'

import { Eye, Code } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

interface DetailContentTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
}

export function DetailContentTab({ productData, updateField }: DetailContentTabProps) {
  return (
    <TabsContent value="detail" className="mt-6">
      <Card className="min-h-[600px]">
        <CardHeader className="border-b py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">상세 설명 (HTML)</CardTitle>
            <Badge variant="outline">{productData.detailContent?.length || 0}자</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="editor">
            <div className="border-b px-4">
              <TabsList className="h-10 bg-transparent">
                <TabsTrigger value="editor" className="gap-2"><Code className="h-4 w-4" />HTML 편집</TabsTrigger>
                <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />미리보기</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="editor" className="p-4 m-0">
              <Textarea value={productData.detailContent || ''} onChange={(e) => updateField('detailContent', e.target.value)} placeholder="HTML 상세페이지 내용..." className="min-h-[500px] font-mono text-sm" />
            </TabsContent>
            <TabsContent value="preview" className="p-4 m-0">
              <iframe
                title="상품 상세 HTML 미리보기"
                sandbox=""
                srcDoc={productData.detailContent || '<p>미리보기 내용이 없습니다.</p>'}
                className="w-full min-h-[500px] rounded-lg border bg-white"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
