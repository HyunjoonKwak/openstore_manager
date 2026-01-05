'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Sparkles,
  Copy,
  Check,
  Zap,
  Link2,
  Clock,
  Save,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { saveDetailPage } from '@/lib/actions/detail-pages'
import { getProducts, type ProductWithSupplier } from '@/lib/actions/products'

interface GeneratedContent {
  title: string
  features: string[]
  description: string
}

interface AnalysisResult {
  overallScore: number
  seoScore: number
  conversionScore: number
  readabilityScore: number
  improvements: Array<{
    category: string
    issue: string
    suggestion: string
    priority: 'high' | 'medium' | 'low'
    impact: string
  }>
  suggestedTitle: string
  suggestedFeatures: string[]
  suggestedDescription: string
  competitorInsights: string
}

export default function AIGeneratorPage() {
  const [activeTab, setActiveTab] = useState('generate')
  const [products, setProducts] = useState<ProductWithSupplier[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [keywords, setKeywords] = useState('')
  const [category, setCategory] = useState('electronics')
  const [tone, setTone] = useState('professional')
  const [seoEnabled, setSeoEnabled] = useState(true)
  const [htmlEnabled, setHtmlEnabled] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hasGenerated, setHasGenerated] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const [generated, setGenerated] = useState<GeneratedContent>({
    title: '',
    features: [],
    description: '',
  })

  useEffect(() => {
    async function loadProducts() {
      const result = await getProducts()
      if (result.data) {
        setProducts(result.data)
      }
    }
    loadProducts()
  }, [])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product) {
      setKeywords(product.name)
      if (product.category) {
        const categoryMap: Record<string, string> = {
          전자제품: 'electronics',
          패션: 'fashion',
          홈리빙: 'home',
          뷰티: 'beauty',
          식품: 'food',
        }
        const matchedCategory = Object.entries(categoryMap).find(([k]) =>
          product.category?.includes(k)
        )
        if (matchedCategory) {
          setCategory(matchedCategory[1])
        }
      }
    }
  }

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      toast.error('키워드를 입력해주세요.')
      return
    }

    setIsGenerating(true)
    toast.info('AI가 콘텐츠를 생성하고 있습니다...')

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          category,
          tone,
          options: { seo: seoEnabled, html: htmlEnabled },
        }),
      })

      if (!response.ok) {
        throw new Error('Generation failed')
      }

      const data = await response.json()
      setGenerated(data)
      setHasGenerated(true)
      toast.success('콘텐츠 생성이 완료되었습니다!')
    } catch {
      toast.error('API 키가 설정되지 않았습니다. 설정 페이지에서 OpenAI API 키를 입력하세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedProductId) {
      toast.error('분석할 상품을 선택해주세요.')
      return
    }

    setIsAnalyzing(true)
    toast.info('AI가 상품 페이지를 분석하고 있습니다...')

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProduct?.name,
          productDescription: '',
          currentTitle: selectedProduct?.name,
          currentFeatures: [],
          imageUrl: selectedProduct?.imageUrl,
          category: selectedProduct?.category,
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setAnalysisResult(data)
      toast.success('분석이 완료되었습니다!')
    } catch {
      toast.error('API 키가 설정되지 않았습니다. 설정 페이지에서 OpenAI API 키를 입력하세요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDetailPage({
        title: generated.title,
        features: generated.features,
        description: generated.description,
        keywords,
        category,
        tone,
      })

      if (result.data) {
        toast.success('상세페이지가 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleCopy = async (field: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedField(field)
    toast.success('클립보드에 복사되었습니다.')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyButton = ({ field, content }: { field: string; content: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => handleCopy(field, content)}
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  )

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => {
    const color =
      score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'
    const bgColor =
      score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-yellow-500' : 'stroke-red-500'

    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-muted"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className={bgColor}
              strokeWidth="3"
              strokeDasharray={`${score} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}>
            {score}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/30',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  }

  return (
    <>
      <Header title="AI 상세페이지 생성기" subtitle="MODULE 04" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI 크레딧</p>
                <p className="text-lg font-bold">850 / 1,000</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-green-500/10 p-2 text-green-500">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">등록 상품</p>
                <p className="text-lg font-bold">{products.length}개</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">마지막 동기화</p>
                <p className="text-lg font-bold">방금 전</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="h-4 w-4" />
              콘텐츠 생성
            </TabsTrigger>
            <TabsTrigger value="analyze" className="gap-2">
              <Search className="h-4 w-4" />
              페이지 분석
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="border-b border-border py-4">
                  <CardTitle className="text-lg font-bold">입력 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label>상품 선택 (선택사항)</Label>
                    <Select value={selectedProductId} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="상품을 선택하면 키워드가 자동 입력됩니다" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">
                      타겟 키워드
                      <span className="text-muted-foreground text-xs ml-2">(쉼표로 구분)</span>
                    </Label>
                    <Input
                      id="keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="무선 이어폰, 블루투스, 노이즈캔슬링"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>카테고리</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">전자제품</SelectItem>
                          <SelectItem value="fashion">패션</SelectItem>
                          <SelectItem value="home">홈/리빙</SelectItem>
                          <SelectItem value="beauty">뷰티</SelectItem>
                          <SelectItem value="food">식품</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>톤 & 스타일</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">전문적</SelectItem>
                          <SelectItem value="friendly">친근한</SelectItem>
                          <SelectItem value="luxury">럭셔리</SelectItem>
                          <SelectItem value="casual">캐주얼</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">향상 모듈</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">SEO 최적화</p>
                          <p className="text-xs text-muted-foreground">검색 엔진 최적화</p>
                        </div>
                        <Switch checked={seoEnabled} onCheckedChange={setSeoEnabled} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">HTML 포맷</p>
                          <p className="text-xs text-muted-foreground">HTML 태그 포함</p>
                        </div>
                        <Switch checked={htmlEnabled} onCheckedChange={setHtmlEnabled} />
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full h-12" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5 mr-2" />
                    )}
                    {isGenerating ? '생성 중...' : '콘텐츠 생성'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-border py-4">
                  <CardTitle className="text-lg font-bold">미리보기</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {!hasGenerated && !generated.title ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        키워드를 입력하고 콘텐츠 생성 버튼을 클릭하세요
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            상품 제목
                          </Label>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {generated.title.length}/200
                            </Badge>
                            <CopyButton field="title" content={generated.title} />
                          </div>
                        </div>
                        <p className="text-lg font-semibold leading-relaxed">{generated.title}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            핵심 특징
                          </Label>
                          <CopyButton field="features" content={generated.features.join('\n')} />
                        </div>
                        <ul className="space-y-2">
                          {generated.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-1">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            상품 설명
                          </Label>
                          <CopyButton field="description" content={generated.description} />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {generated.description}
                        </p>
                      </div>

                      {hasGenerated && (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleSave}
                          disabled={isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isPending ? '저장 중...' : '상세페이지 저장'}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyze">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="border-b border-border py-4">
                  <CardTitle className="text-lg font-bold">상품 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label>분석할 상품</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="상품을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt=""
                                  className="w-6 h-6 rounded object-cover"
                                />
                              )}
                              <span>{product.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProduct && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex gap-4">
                          {selectedProduct.imageUrl && (
                            <img
                              src={selectedProduct.imageUrl}
                              alt={selectedProduct.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 space-y-1">
                            <h4 className="font-medium">{selectedProduct.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {selectedProduct.category || '카테고리 없음'}
                            </p>
                            <p className="text-sm font-medium">
                              {new Intl.NumberFormat('ko-KR', {
                                style: 'currency',
                                currency: 'KRW',
                              }).format(selectedProduct.price)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    className="w-full h-12"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !selectedProductId}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5 mr-2" />
                    )}
                    {isAnalyzing ? '분석 중...' : '페이지 분석 시작'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-border py-4">
                  <CardTitle className="text-lg font-bold">분석 결과</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {!analysisResult ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        상품을 선택하고 분석을 시작하세요
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-around">
                        <ScoreCircle score={analysisResult.overallScore} label="종합" />
                        <ScoreCircle score={analysisResult.seoScore} label="SEO" />
                        <ScoreCircle score={analysisResult.conversionScore} label="전환율" />
                        <ScoreCircle score={analysisResult.readabilityScore} label="가독성" />
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          개선 제안
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {analysisResult.improvements.map((item, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-lg border bg-card space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${priorityColors[item.priority]}`}
                                >
                                  {item.priority === 'high'
                                    ? '높음'
                                    : item.priority === 'medium'
                                    ? '보통'
                                    : '낮음'}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{item.issue}</p>
                              <p className="text-xs text-muted-foreground">{item.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          추천 제목
                        </h4>
                        <div className="p-3 rounded-lg border bg-muted/30 flex justify-between items-start">
                          <p className="text-sm flex-1">{analysisResult.suggestedTitle}</p>
                          <CopyButton
                            field="suggestedTitle"
                            content={analysisResult.suggestedTitle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
