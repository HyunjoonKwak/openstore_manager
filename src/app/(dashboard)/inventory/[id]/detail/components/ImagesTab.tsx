'use client'

import Image from 'next/image'
import { Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

interface ImagesTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
  newImageUrl: string
  setNewImageUrl: (value: string) => void
  addOptionalImage: () => void
  removeOptionalImage: (index: number) => void
}

export function ImagesTab({
  productData,
  updateField,
  newImageUrl,
  setNewImageUrl,
  addOptionalImage,
  removeOptionalImage,
}: ImagesTabProps) {
  return (
    <TabsContent value="images" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상품 이미지</CardTitle>
          <CardDescription>대표 이미지 1장 + 추가 이미지 최대 9장</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="detail-representative-image-url">대표 이미지 URL</Label>
            <Input id="detail-representative-image-url" value={productData.representativeImageUrl || ''} onChange={(e) => updateField('representativeImageUrl', e.target.value)} placeholder="https://..." />
            {productData.representativeImageUrl && (
              <div className="mt-2">
                <Image src={productData.representativeImageUrl} alt="대표이미지" width={150} height={150} className="rounded-lg object-cover border" />
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-4">
            <Label htmlFor="detail-new-image-url">추가 이미지 ({productData.optionalImageUrls?.length || 0}/9)</Label>
            <div className="flex gap-2">
              <Input id="detail-new-image-url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="이미지 URL 입력" className="flex-1" />
              <Button onClick={addOptionalImage} disabled={!newImageUrl}>
                <Plus className="h-4 w-4 mr-1" />추가
              </Button>
            </div>
            {productData.optionalImageUrls && productData.optionalImageUrls.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {productData.optionalImageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <Image src={url} alt={`추가이미지 ${index + 1}`} width={100} height={100} className="rounded-lg object-cover border w-full aspect-square" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeOptionalImage(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
