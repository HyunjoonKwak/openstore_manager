// 새 가격 분석 전용 구조
export interface PriceAnalysis {
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
export interface NewAnalysis {
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

export interface AnalysisResult extends NewAnalysis, PriceAnalysis {
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

export interface ExtensionAnalysis {
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
