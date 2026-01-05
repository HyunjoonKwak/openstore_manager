'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Layout,
  Palette,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Download,
  Star,
  ShoppingCart,
  Store,
  RefreshCw,
  Maximize2,
  DollarSign,
  Settings,
  Type,
  TrendingUp,
  FileText
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { AnalysisLog } from '@/lib/actions/analysis'

// 새 가격 분석 전용 구조
interface PriceAnalysis {
  productComposition?: {
    productName?: string
    baseUnit?: string
    totalQuantity?: string
    individualItems?: string[]
    servingSize?: string
  }
  unitPricing?: {
    salePrice?: number
    originalPrice?: number
    discountRate?: string
    pricePerKg?: string
    pricePerUnit?: string
    pricePerServing?: string
    pricePerMl?: string
  }
  shippingCost?: {
    baseFee?: string
    freeShippingCondition?: string
    additionalFees?: string[]
  }
  optionAnalysis?: {
    availableOptions?: Array<{
      name: string
      price: number
      pricePerKg?: string
      isBestValue?: boolean
    }>
    bestValueOption?: string
    optionPriceRange?: string
  }
  promotions?: {
    availableCoupons?: string[]
    pointsEarned?: string
    cardBenefits?: string[]
    bundleDeals?: string
  }
  competitiveAnalysis?: {
    pricePosition?: string
    valueForMoney?: number
    priceAdvantages?: string[]
    priceDisadvantages?: string[]
  }
  priceSummary?: {
    oneLiner?: string
    effectivePrice?: string
    recommendation?: string
  }
}

// 구버전 호환용
interface NewAnalysis {
  pricing?: {
    strategy: string
    originalPrice?: number
    salePrice?: number
    discountRate?: string
    shippingFee?: string
    additionalOffers?: string[]
  }
  productSettings?: {
    titlePattern: string
    titleKeywords?: string[]
    optionStrategy?: string
    options?: string[]
    category?: string
  }
  design?: {
    mainColors?: Array<{hex: string, usage: string}>
    fontStyle?: string
    layoutPattern?: string
    sections?: Array<{order: number, name: string, description: string}>
    highlights?: string[]
  }
  copywriting?: {
    headlines?: string[]
    benefits?: string[]
    trustElements?: string[]
    ctas?: string[]
  }
  benchmarkInsights?: {
    successFactors?: string[]
    applyToMyProduct?: string[]
    warnings?: string[]
  }
  summary?: string
}

interface AnalysisResult extends NewAnalysis, PriceAnalysis {
  structure?: {
    sections: Array<{
      type: string
      title: string
      content: string
      position: number
    }>
    summary: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
  style?: {
    colors: Array<{
      hex: string
      usage: string
      frequency: number
    }>
    fonts: Array<{
      family: string
      usage: string
    }>
    keywords: Array<{
      word: string
      frequency: number
      category: string
    }>
    copyHighlights: {
      hooks: string[]
      benefits: string[]
      ctas: string[]
    }
    layoutPattern: string
    designRecommendations: string[]
  }
  extracted?: {
    colors: string[]
    fonts: string[]
    topKeywords: Array<[string, number]>
  }
  analyzedAt: string
  analysis?: ExtensionAnalysis
  extractedData?: {
    product?: {
      title?: string
      price?: number
      originalPrice?: number
      discountRate?: string
      mainImage?: string
      additionalImages?: string[]
      storeName?: string
      reviewCount?: number
      rating?: string
      purchaseCount?: number
      description?: string
      categories?: string[]
      options?: string[]
      deliveryInfo?: string
    }
    page?: {
      title?: string
      metaDescription?: string
      detailImages?: string[]
      detailText?: string
      colors?: Array<{ color: string; count: number }>
    }
  }
  hasScreenshot?: boolean
  screenshotUrl?: string
}

interface ExtensionAnalysis {
  structure?: {
    sections?: Array<{
      name: string
      effectiveness: string
      notes: string
    }>
    overallFlow?: string
    strengths?: string[]
    weaknesses?: string[]
  }
  marketing?: {
    headlineScore?: number
    headlineAnalysis?: string
    benefits?: string[]
    ctaAnalysis?: string
    emotionalTriggers?: string[]
  }
  visual?: {
    colorAnalysis?: string
    imageQuality?: string
    designScore?: number
    designNotes?: string
  }
  competitive?: {
    pricingStrategy?: string
    uniqueSellingPoints?: string[]
    marketPosition?: string
  }
  recommendations?: Array<{
    priority: number
    category: string
    action: string
    expectedImpact: string
  }>
  overallScore?: number
  summary?: string
}

interface AnalysisResultClientProps {
  analysis: AnalysisLog
}

export function AnalysisResultClient({ analysis }: AnalysisResultClientProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pricing')
  const [iframeError, setIframeError] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const result = analysis.analysisResult as unknown as AnalysisResult
  
  const isPriceAnalysis = !!(result.productComposition || result.unitPricing || result.optionAnalysis)
  const isNewStructure = !!(result.pricing || result.productSettings || result.design || result.copywriting)
  const isExtensionResult = !!result.analysis && !isNewStructure && !isPriceAnalysis

  useEffect(() => {
    if (isPriceAnalysis) setActiveTab('price-composition')
    else if (isNewStructure) setActiveTab('pricing')
    else if (isExtensionResult) setActiveTab('structure')
    else setActiveTab('structure')
  }, [isPriceAnalysis, isNewStructure, isExtensionResult])

  const handleCopy = async (text: string, field: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('클립보드에 복사되었습니다.')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const reloadIframe = () => {
    setIframeError(false)
    setIframeKey(prev => prev + 1)
  }

  const getPreviewContent = () => {
    if (!iframeError) {
      return (
        <iframe
          key={iframeKey}
          src={analysis.targetUrl}
          className="w-full h-full border-0"
          onError={() => setIframeError(true)}
        />
      )
    }

    const imageUrl = result.extractedData?.product?.mainImage
    
    if (imageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/20">
          <img 
            src={imageUrl} 
            alt="Product Preview" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-6 text-center">
        <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
        <p>미리보기를 불러올 수 없습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.open(analysis.targetUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          새 탭에서 열기
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="분석 결과" subtitle={extractDomain(analysis.targetUrl)} />

      <main className="flex-1 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/benchmarking">
                <ArrowLeft className="h-4 w-4 mr-2" />
                목록으로
              </Link>
            </Button>
            <div className="h-4 w-px bg-border mx-2" />
            <h1 className="font-semibold text-lg truncate max-w-[200px] sm:max-w-md">
              {result.extractedData?.product?.title || analysis.targetUrl}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(analysis.targetUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              원본 보기
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-full">
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] flex flex-col gap-4">
            <Card className="flex-1 overflow-hidden flex flex-col shadow-md border-muted">
              <div className="bg-muted/50 p-2 flex items-center justify-between border-b text-xs">
                <div className="flex items-center gap-2 text-muted-foreground truncate px-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                  </div>
                  <span className="ml-2 truncate max-w-[300px]">{analysis.targetUrl}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reloadIframe} title="새로고침">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 bg-white relative">
                {getPreviewContent()}
                {!iframeError && (
                   <div className="absolute top-2 right-2 z-10">
                     <Button 
                       variant="secondary" 
                       size="sm" 
                       className="opacity-50 hover:opacity-100 transition-opacity text-xs h-7"
                       onClick={() => setIframeError(true)}
                     >
                       이미지로 보기
                     </Button>
                   </div>
                )}
              </div>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                {result.extractedData?.product?.mainImage && (
                  <img 
                    src={result.extractedData.product.mainImage} 
                    alt="Thumbnail" 
                    className="w-16 h-16 rounded-md object-cover border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{analysis.targetPlatform}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.analyzedAt || analysis.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-bold text-lg">
                    {result.extractedData?.product?.price?.toLocaleString()}원
                    {result.extractedData?.product?.discountRate && (
                      <span className="text-red-500 text-sm ml-2">{result.extractedData.product.discountRate}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6 pb-20">
            {isPriceAnalysis ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6 h-auto p-1">
                  <TabsTrigger value="price-composition" className="text-xs sm:text-sm py-2">상품구성</TabsTrigger>
                  <TabsTrigger value="price-unit" className="text-xs sm:text-sm py-2">단가분석</TabsTrigger>
                  <TabsTrigger value="price-options" className="text-xs sm:text-sm py-2">옵션비교</TabsTrigger>
                  <TabsTrigger value="price-promotions" className="text-xs sm:text-sm py-2">혜택</TabsTrigger>
                  <TabsTrigger value="price-summary" className="text-xs sm:text-sm py-2">종합</TabsTrigger>
                </TabsList>

                <TabsContent value="price-composition" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-500" />
                        상품 구성
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-lg mb-2">{result.productComposition?.productName}</h3>
                        <p className="text-muted-foreground">{result.productComposition?.baseUnit}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">총 수량/용량</p>
                          <p className="text-2xl font-bold text-blue-600">{result.productComposition?.totalQuantity || '-'}</p>
                        </div>
                        {result.productComposition?.servingSize && (
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-1">1회 제공량</p>
                            <p className="text-lg font-medium">{result.productComposition.servingSize}</p>
                          </div>
                        )}
                      </div>

                      {result.productComposition?.individualItems && result.productComposition.individualItems.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3 text-sm text-muted-foreground">구성품 목록</h3>
                          <ul className="space-y-2">
                            {result.productComposition.individualItems.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm p-3 bg-muted/30 rounded-lg border">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="price-unit" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-500" />
                        단위당 가격
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                          <p className="text-sm text-muted-foreground mb-1">판매가</p>
                          <p className="text-2xl font-bold text-green-700">
                            {result.unitPricing?.salePrice?.toLocaleString() || '-'}원
                          </p>
                          {result.unitPricing?.originalPrice && (
                            <p className="text-sm text-muted-foreground line-through">
                              {result.unitPricing.originalPrice.toLocaleString()}원
                            </p>
                          )}
                          {result.unitPricing?.discountRate && (
                            <Badge variant="destructive" className="mt-2">{result.unitPricing.discountRate}</Badge>
                          )}
                        </div>
                        
                        {result.unitPricing?.pricePerKg && (
                          <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                            <p className="text-sm text-muted-foreground mb-1">kg당 가격</p>
                            <p className="text-2xl font-bold text-orange-700">{result.unitPricing.pricePerKg}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {result.unitPricing?.pricePerUnit && (
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-1">개당 가격</p>
                            <p className="text-lg font-bold">{result.unitPricing.pricePerUnit}</p>
                          </div>
                        )}
                        {result.unitPricing?.pricePerServing && (
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-1">1회분 가격</p>
                            <p className="text-lg font-bold">{result.unitPricing.pricePerServing}</p>
                          </div>
                        )}
                        {result.unitPricing?.pricePerMl && (
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-1">ml당 가격</p>
                            <p className="text-lg font-bold">{result.unitPricing.pricePerMl}</p>
                          </div>
                        )}
                      </div>

                      {result.shippingCost && (
                        <div className="p-4 rounded-lg border">
                          <h3 className="font-medium mb-3">배송비</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">기본 배송비:</span> <span className="font-medium">{result.shippingCost.baseFee}</span></p>
                            {result.shippingCost.freeShippingCondition && (
                              <p><span className="text-muted-foreground">무료배송 조건:</span> <span className="font-medium text-green-600">{result.shippingCost.freeShippingCondition}</span></p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="price-options" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-500" />
                        옵션별 가격 비교
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {result.optionAnalysis?.bestValueOption && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <span className="font-medium text-yellow-800">가성비 최고 옵션</span>
                          </div>
                          <p className="text-lg font-bold">{result.optionAnalysis.bestValueOption}</p>
                        </div>
                      )}

                      {result.optionAnalysis?.optionPriceRange && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">가격 범위: </span>
                          <span className="font-medium">{result.optionAnalysis.optionPriceRange}</span>
                        </div>
                      )}

                      {result.optionAnalysis?.availableOptions && result.optionAnalysis.availableOptions.length > 0 && (
                        <div className="space-y-3">
                          {result.optionAnalysis.availableOptions.map((opt, idx) => (
                            <div 
                              key={idx} 
                              className={`p-4 rounded-lg border flex items-center justify-between ${opt.isBestValue ? 'bg-yellow-50 border-yellow-300' : ''}`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{opt.name}</span>
                                  {opt.isBestValue && <Badge className="bg-yellow-500">BEST</Badge>}
                                </div>
                                {opt.pricePerKg && <p className="text-sm text-muted-foreground">{opt.pricePerKg}</p>}
                              </div>
                              <p className="text-lg font-bold">{opt.price?.toLocaleString()}원</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!result.optionAnalysis?.availableOptions || result.optionAnalysis.availableOptions.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">옵션 정보가 없습니다.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="price-promotions" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        혜택 및 프로모션
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {result.promotions?.availableCoupons && result.promotions.availableCoupons.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3 text-sm text-muted-foreground">적용 가능 쿠폰</h3>
                          <div className="space-y-2">
                            {result.promotions.availableCoupons.map((coupon, idx) => (
                              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm">
                                {coupon}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.promotions?.pointsEarned && (
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">적립 포인트</p>
                          <p className="text-lg font-bold text-blue-600">{result.promotions.pointsEarned}</p>
                        </div>
                      )}

                      {result.promotions?.cardBenefits && result.promotions.cardBenefits.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3 text-sm text-muted-foreground">카드사 혜택</h3>
                          <ul className="space-y-2">
                            {result.promotions.cardBenefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.promotions?.bundleDeals && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h3 className="font-medium mb-2 text-purple-800">묶음 할인</h3>
                          <p className="text-sm">{result.promotions.bundleDeals}</p>
                        </div>
                      )}

                      {!result.promotions?.availableCoupons?.length && !result.promotions?.pointsEarned && !result.promotions?.cardBenefits?.length && (
                        <p className="text-center text-muted-foreground py-8">확인된 프로모션이 없습니다.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="price-summary" className="space-y-6">
                  {result.priceSummary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-indigo-500" />
                          종합 분석
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <p className="text-lg font-medium text-indigo-800">{result.priceSummary.oneLiner}</p>
                        </div>

                        {result.priceSummary.effectivePrice && (
                          <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                            <p className="text-sm text-muted-foreground mb-1">실질 구매가 (할인 적용 후)</p>
                            <p className="text-3xl font-bold text-green-700">{result.priceSummary.effectivePrice}</p>
                          </div>
                        )}

                        {result.priceSummary.recommendation && (
                          <div className="p-4 rounded-lg border">
                            <h3 className="font-medium mb-2">구매 추천</h3>
                            <p className="text-sm">{result.priceSummary.recommendation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {result.competitiveAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>경쟁력 분석</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg border flex-1">
                            <p className="text-sm text-muted-foreground mb-1">가격 포지셔닝</p>
                            <p className="font-bold">{result.competitiveAnalysis.pricePosition}</p>
                          </div>
                          {result.competitiveAnalysis.valueForMoney && (
                            <div className="p-3 rounded-lg border">
                              <p className="text-sm text-muted-foreground mb-1">가성비</p>
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map(i => (
                                  <Star 
                                    key={i} 
                                    className={`h-5 w-5 ${i <= result.competitiveAnalysis!.valueForMoney! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.competitiveAnalysis.priceAdvantages && result.competitiveAnalysis.priceAdvantages.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> 강점
                              </h4>
                              <ul className="space-y-1">
                                {result.competitiveAnalysis.priceAdvantages.map((adv, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground">• {adv}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {result.competitiveAnalysis.priceDisadvantages && result.competitiveAnalysis.priceDisadvantages.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-red-700 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" /> 약점
                              </h4>
                              <ul className="space-y-1">
                                {result.competitiveAnalysis.priceDisadvantages.map((dis, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground">• {dis}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            ) : isNewStructure ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="structure"><Layout className="h-4 w-4 mr-2"/>구조</TabsTrigger>
                  <TabsTrigger value="design"><Palette className="h-4 w-4 mr-2"/>디자인</TabsTrigger>
                  <TabsTrigger value="copy"><MessageSquare className="h-4 w-4 mr-2"/>마케팅</TabsTrigger>
                  <TabsTrigger value="assets"><ImageIcon className="h-4 w-4 mr-2"/>에셋</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structure" className="space-y-6">
                   {result.structure && (
                     <Card>
                       <CardHeader><CardTitle>페이지 구조</CardTitle></CardHeader>
                       <CardContent className="space-y-4">
                         <p className="text-muted-foreground">{result.structure.summary}</p>
                         <div className="space-y-2">
                           {result.structure.sections.map((s, i) => (
                             <div key={i} className="p-3 border rounded-lg">
                               <span className="font-bold mr-2">{s.title}</span>
                               <span className="text-sm text-muted-foreground">{s.content}</span>
                             </div>
                           ))}
                         </div>
                       </CardContent>
                     </Card>
                   )}
                   {isExtensionResult && result.analysis?.structure && (
                     <Card>
                        <CardHeader><CardTitle>구조 분석 (Extension)</CardTitle></CardHeader>
                        <CardContent>
                          <p>{result.analysis.structure.overallFlow}</p>
                        </CardContent>
                     </Card>
                   )}
                </TabsContent>
                
                <TabsContent value="design" className="space-y-6">
                  {result.style && (
                    <Card>
                      <CardHeader><CardTitle>디자인 분석</CardTitle></CardHeader>
                      <CardContent>
                        <p>레이아웃: {result.style.layoutPattern}</p>
                        <div className="flex gap-2 mt-4">
                          {result.style.colors.map((c,i) => (
                            <div key={i} className="w-8 h-8 rounded" style={{backgroundColor: c.hex}} title={c.hex} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="copy" className="space-y-6">
                  {result.style?.copyHighlights && (
                    <Card>
                      <CardHeader><CardTitle>카피 분석</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                         <div>
                           <h4 className="font-bold">Hooks</h4>
                           <ul>{result.style.copyHighlights.hooks.map((h,i)=><li key={i}>{h}</li>)}</ul>
                         </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="assets">
                   <Card><CardContent className="p-6 text-center text-muted-foreground">에셋 정보는 새 탭 '에셋'을 확인하세요.</CardContent></Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
