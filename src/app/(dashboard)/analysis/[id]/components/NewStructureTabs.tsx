'use client'
/* eslint-disable @next/next/no-img-element -- 분석 대상의 임의 원격 이미지를 원본 비율로 비교합니다. */

import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  Lightbulb,
  Palette,
  Settings,
  Star,
  TrendingUp,
  Type,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { AnalysisResult } from '../analysis-types'

interface NewStructureTabsProps {
  result: AnalysisResult
  activeTab: string
  onTabChange: (value: string) => void
}

export function NewStructureTabs({ result, activeTab, onTabChange }: NewStructureTabsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = async (text: string, field: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('클립보드에 복사되었습니다.')
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6 h-auto p-1">
        <TabsTrigger value="pricing" className="text-xs sm:text-sm py-2">가격정책</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">상품설정</TabsTrigger>
        <TabsTrigger value="design" className="text-xs sm:text-sm py-2">디자인</TabsTrigger>
        <TabsTrigger value="copy" className="text-xs sm:text-sm py-2">카피</TabsTrigger>
        <TabsTrigger value="insights" className="text-xs sm:text-sm py-2">인사이트</TabsTrigger>
        <TabsTrigger value="assets" className="text-xs sm:text-sm py-2">에셋</TabsTrigger>
      </TabsList>

      <TabsContent value="pricing" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              가격 및 혜택 전략
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2 text-sm text-muted-foreground">가격 전략</h3>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <p className="font-medium text-lg">{result.pricing?.strategy || '분석된 전략 없음'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">판매가</p>
                <p className="text-xl font-bold">{result.pricing?.salePrice?.toLocaleString() || '-'}원</p>
                {result.pricing?.originalPrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    {result.pricing.originalPrice.toLocaleString()}원
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">배송비</p>
                <p className="text-lg font-medium">{result.pricing?.shippingFee || '-'}</p>
              </div>
            </div>

            {result.pricing?.additionalOffers && result.pricing.additionalOffers.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">추가 혜택</h3>
                <ul className="space-y-2">
                  {result.pricing.additionalOffers.map((offer, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-green-500/5 text-green-700 rounded border border-green-200">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {offer}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              상품 설정 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2 text-sm text-muted-foreground">상품명 패턴</h3>
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="font-medium">{result.productSettings?.titlePattern}</p>
              </div>
            </div>

            {result.productSettings?.titleKeywords && (
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">주요 키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {result.productSettings.titleKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1 cursor-pointer hover:bg-secondary/80" onClick={() => handleCopy(kw, `kw-${i}`)}>
                      {kw}
                      {copiedField === `kw-${i}` ? <Check className="ml-1 h-3 w-3" /> : null}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">옵션 구성 전략</h3>
                <p className="text-sm leading-relaxed">{result.productSettings?.optionStrategy || '정보 없음'}</p>
              </div>
              {result.productSettings?.options && (
                <div>
                  <h3 className="font-medium mb-2 text-sm text-muted-foreground">옵션 목록</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {result.productSettings.options.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="design" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              디자인 요소
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.design?.mainColors && (
              <div>
                <h3 className="font-medium mb-3 text-sm text-muted-foreground">메인 컬러</h3>
                <div className="flex flex-wrap gap-4">
                  {result.design.mainColors.map((color, i) => (
                    <div
                      key={i}
                      className="group flex flex-col gap-2 cursor-pointer"
                      onClick={() => handleCopy(color.hex, `color-${i}`)}
                    >
                      <div
                        className="w-16 h-16 rounded-lg shadow-sm border ring-1 ring-black/5 relative"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg">
                          {copiedField === `color-${i}` ? <Check className="h-6 w-6 text-white" /> : <Copy className="h-6 w-6 text-white" />}
                        </div>
                      </div>
                      <div className="text-xs text-center">
                        <p className="font-mono font-medium">{color.hex}</p>
                        <p className="text-muted-foreground scale-90">{color.usage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">폰트 스타일</h3>
                <p className="text-sm border p-3 rounded-md bg-muted/20">{result.design?.fontStyle || '-'}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">레이아웃 패턴</h3>
                <p className="text-sm border p-3 rounded-md bg-muted/20">{result.design?.layoutPattern || '-'}</p>
              </div>
            </div>

            {result.design?.sections && (
              <div>
                <h3 className="font-medium mb-3 text-sm text-muted-foreground">상세페이지 구조</h3>
                <div className="space-y-3 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {result.design.sections.map((section, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border flex items-center justify-center text-sm font-bold z-10 shadow-sm">
                        {section.order}
                      </div>
                      <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <h4 className="font-bold text-sm mb-1">{section.name}</h4>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="copy" className="space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-orange-500" />
                헤드라인 & 훅
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.copywriting?.headlines?.map((text, i) => (
                  <div
                    key={i}
                    className="p-3 bg-muted/30 hover:bg-muted rounded-lg border flex justify-between gap-3 cursor-pointer transition-colors"
                    onClick={() => handleCopy(text, `headline-${i}`)}
                  >
                    <p className="text-sm font-medium">{text}</p>
                    {copiedField === `headline-${i}` ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <Copy className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                강조된 혜택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.copywriting?.benefits?.map((text, i) => (
                  <div
                    key={i}
                    className="p-3 bg-yellow-50/50 hover:bg-yellow-100/50 rounded-lg border border-yellow-100 flex justify-between gap-3 cursor-pointer transition-colors"
                    onClick={() => handleCopy(text, `benefit-${i}`)}
                  >
                    <p className="text-sm text-yellow-900">{text}</p>
                    {copiedField === `benefit-${i}` ? <Check className="h-4 w-4 text-yellow-600 shrink-0" /> : <Copy className="h-4 w-4 text-yellow-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">신뢰 요소 (Trust)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.copywriting?.trustElements?.map((text, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CTA (행동 유도)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.copywriting?.ctas?.map((text, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="font-medium">{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="insights" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              성공 요인 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.benchmarkInsights?.successFactors?.map((factor, i) => (
                <li key={i} className="flex gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-indigo-900">{factor}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                벤치마킹 포인트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.benchmarkInsights?.applyToMyProduct?.map((item, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-yellow-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                주의사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.benchmarkInsights?.warnings?.map((item, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-red-500">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="assets" className="space-y-6">
        {result.extractedData?.product?.additionalImages && result.extractedData.product.additionalImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">상품 이미지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {result.extractedData.product.mainImage && (
                  <div className="relative group aspect-square">
                    <img src={result.extractedData.product.mainImage} alt="Main" className="w-full h-full object-cover rounded-md border" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-md">
                      <Button size="icon" variant="ghost" className="text-white hover:text-white" onClick={() => handleCopy(result.extractedData!.product!.mainImage!, 'main-img')}>
                        {copiedField === 'main-img' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                {result.extractedData.product.additionalImages.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={img} alt={`Add ${i}`} className="w-full h-full object-cover rounded-md border" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-md">
                      <Button size="icon" variant="ghost" className="text-white hover:text-white" onClick={() => handleCopy(img, `add-img-${i}`)}>
                        {copiedField === `add-img-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result.extractedData?.page?.detailImages && result.extractedData.page.detailImages.length > 0 && (
           <Card>
             <CardHeader>
               <CardTitle className="text-lg font-bold">상세페이지 이미지</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                 {result.extractedData.page.detailImages.slice(0, 12).map((img, i) => (
                   <div key={i} className="relative group aspect-square">
                     <img src={img} alt={`Detail ${i}`} className="w-full h-full object-cover rounded-md border" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-md">
                       <Button size="icon" variant="ghost" className="text-white hover:text-white" onClick={() => window.open(img, '_blank')}>
                         <ExternalLink className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
               {result.extractedData.page.detailImages.length > 12 && (
                 <p className="text-center text-sm text-muted-foreground mt-4">
                   +{result.extractedData.page.detailImages.length - 12}장의 이미지가 더 있습니다.
                 </p>
               )}
             </CardContent>
           </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
