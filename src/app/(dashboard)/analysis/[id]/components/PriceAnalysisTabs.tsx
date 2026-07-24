'use client'

import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { AnalysisResult } from '../analysis-types'

interface PriceAnalysisTabsProps {
  result: AnalysisResult
  activeTab: string
  onTabChange: (value: string) => void
}

export function PriceAnalysisTabs({ result, activeTab, onTabChange }: PriceAnalysisTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
  )
}
