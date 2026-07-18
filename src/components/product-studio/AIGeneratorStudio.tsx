'use client'
/* eslint-disable @next/next/no-img-element -- 사용자가 등록한 상품 이미지를 미리보기합니다. */

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  FolderSearch,
  Lightbulb,
  Loader2,
  Package,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  deleteDetailPage,
  getDetailPages,
  saveDetailPage,
  type DetailPageItem,
} from '@/lib/actions/detail-pages'
import { getProducts, type ProductWithSupplier } from '@/lib/actions/products'
import {
  getBenchmarkSession,
  getBenchmarkSessions,
  type BenchmarkSessionWithDetails,
} from '@/lib/actions/benchmark'
import type { BenchmarkSession } from '@/types/database.types'

type SectionId = 'hero' | 'problem' | 'features' | 'comparison' | 'proof' | 'faq' | 'cta'

interface GeneratedContent {
  title: string
  heroKicker: string
  targetAudience: string
  problemTitle: string
  problemBody: string
  features: string[]
  comparisonTitle: string
  comparisonBody: string
  proofTitle: string
  proofBody: string
  faq: Array<{ question: string; answer: string }>
  ctaText: string
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

const emptyContent: GeneratedContent = {
  title: '',
  heroKicker: '',
  targetAudience: '',
  problemTitle: '',
  problemBody: '',
  features: [],
  comparisonTitle: '',
  comparisonBody: '',
  proofTitle: '',
  proofBody: '',
  faq: [],
  ctaText: '',
  description: '',
}

const sectionLabels: Record<SectionId, string> = {
  hero: '핵심 메시지',
  problem: '고객 문제',
  features: '핵심 장점',
  comparison: '선택 기준',
  proof: '근거 · 신뢰',
  faq: 'FAQ',
  cta: '구매 유도',
}

const defaultOrder: SectionId[] = ['hero', 'problem', 'features', 'comparison', 'proof', 'faq', 'cta']

function normalizeGenerated(data: Partial<GeneratedContent>): GeneratedContent {
  return {
    ...emptyContent,
    ...data,
    features: Array.isArray(data.features) ? data.features : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
  }
}

interface AIGeneratorStudioProps {
  initialProductId?: string
  initialSessionId?: string
}

export function AIGeneratorStudio({
  initialProductId = '',
  initialSessionId = '',
}: AIGeneratorStudioProps) {
  const [activeTab, setActiveTab] = useState('create')
  const [products, setProducts] = useState<ProductWithSupplier[]>([])
  const [sessions, setSessions] = useState<BenchmarkSession[]>([])
  const [savedPages, setSavedPages] = useState<DetailPageItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionContext, setSessionContext] = useState<BenchmarkSessionWithDetails | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(false)
  const [keywords, setKeywords] = useState('')
  const [audience, setAudience] = useState('')
  const [proof, setProof] = useState('')
  const [category, setCategory] = useState('electronics')
  const [tone, setTone] = useState('professional')
  const [seoEnabled, setSeoEnabled] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [generated, setGenerated] = useState<GeneratedContent>(emptyContent)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(defaultOrder)
  const [hiddenSections, setHiddenSections] = useState<SectionId[]>([])

  useEffect(() => {
    async function loadInitialData() {
      const [productsResult, sessionsResult, pagesResult] = await Promise.all([
        getProducts(),
        getBenchmarkSessions(),
        getDetailPages(),
      ])
      const loadedProducts = productsResult.data || []
      setProducts(loadedProducts)
      setSessions(sessionsResult.data || [])
      setSavedPages(pagesResult.data || [])

      const params = new URLSearchParams(window.location.search)
      const productId = initialProductId || params.get('productId') || ''
      const sessionId = initialSessionId || params.get('sessionId') || ''
      if (productId) {
        setSelectedProductId(productId)
        applyProduct(productId, loadedProducts)
      }
      if (sessionId) void loadSessionContext(sessionId, loadedProducts)
    }
    void loadInitialData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, initialSessionId])

  const selectedProduct = products.find((product) => product.id === selectedProductId)

  const benchmarkBrief = useMemo(() => {
    if (!sessionContext) return ''
    const comparisonPages = sessionContext.pages.map((page) => page.title || page.url).join('\n- ')
    const checklist = sessionContext.checklists.map((item) => item.content).join('\n- ')
    const memos = sessionContext.memos.map((memo) => memo.content).join('\n- ')
    return [
      sessionContext.description && `프로젝트 목표: ${sessionContext.description}`,
      comparisonPages && `비교 페이지:\n- ${comparisonPages}`,
      checklist && `반영할 개선점:\n- ${checklist}`,
      memos && `조사 메모:\n- ${memos}`,
    ].filter(Boolean).join('\n\n')
  }, [sessionContext])

  const applyProduct = (productId: string, source = products) => {
    setSelectedProductId(productId)
    const product = source.find((item) => item.id === productId)
    if (!product) return
    setKeywords(product.name)
    if (product.category) {
      const categoryMap: Array<[string, string]> = [
        ['전자', 'electronics'], ['패션', 'fashion'], ['홈', 'home'],
        ['리빙', 'home'], ['뷰티', 'beauty'], ['식품', 'food'],
      ]
      const match = categoryMap.find(([label]) => product.category?.includes(label))
      if (match) setCategory(match[1])
    }
  }

  const loadSessionContext = async (sessionId: string, sourceProducts = products) => {
    setSelectedSessionId(sessionId)
    if (sessionId === 'none') {
      setSessionContext(null)
      return
    }
    setIsContextLoading(true)
    const result = await getBenchmarkSession(sessionId)
    setIsContextLoading(false)
    if (!result.data) {
      setSelectedSessionId('none')
      setSessionContext(null)
      toast.error('프로젝트가 없거나 접근할 수 없습니다.')
      return
    }
    setSessionContext(result.data)
    if (result.data.my_product_id) applyProduct(result.data.my_product_id, sourceProducts)
    if (!keywords) setKeywords(result.data.title.replace(/판매페이지|개선|프로젝트/g, '').trim())
  }

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      toast.error('상품명 또는 타겟 키워드를 입력해주세요.')
      return
    }
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          category,
          tone,
          audience,
          proof,
          product: selectedProduct ? {
            name: selectedProduct.name,
            price: selectedProduct.price,
            category: selectedProduct.category,
          } : null,
          benchmarkContext: benchmarkBrief,
          options: { seo: seoEnabled },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '콘텐츠 생성에 실패했습니다.')
      setGenerated(normalizeGenerated(data))
      toast.success('판매페이지 초안이 완성되었습니다.', {
        description: data.usage ? `토큰 ${data.usage.totalTokens?.toLocaleString()}개 · ${data.usage.costKrw}` : undefined,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '콘텐츠 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedProduct) {
      toast.error('분석할 상품을 선택해주세요.')
      return
    }
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProduct.name,
          productDescription: '',
          currentTitle: selectedProduct.name,
          currentFeatures: [],
          imageUrl: selectedProduct.imageUrl,
          category: selectedProduct.category,
          benchmarkContext: benchmarkBrief,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '페이지 분석에 실패했습니다.')
      setAnalysisResult(data)
      toast.success('페이지 진단이 완료되었습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '페이지 분석에 실패했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyAnalysis = () => {
    if (!analysisResult) return
    setGenerated(normalizeGenerated({
      ...generated,
      title: analysisResult.suggestedTitle,
      features: analysisResult.suggestedFeatures,
      description: analysisResult.suggestedDescription,
      comparisonTitle: '비슷해 보여도 선택 기준은 다릅니다',
      comparisonBody: analysisResult.competitorInsights,
      ctaText: '지금 필요한 기준으로 선택하세요.',
    }))
    setActiveTab('create')
    toast.success('추천안을 제작 화면에 적용했습니다.')
  }

  const handleSave = () => {
    if (!generated.title) return
    startTransition(async () => {
      const result = await saveDetailPage({
        ...generated,
        keywords,
        category,
        tone,
        sectionOrder,
        hiddenSections,
        benchmarkSessionId: selectedSessionId && selectedSessionId !== 'none' ? selectedSessionId : undefined,
      })
      if (result.data) {
        setSavedPages((current) => [result.data!, ...current])
        toast.success('판매페이지를 저장했습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleDeleteSaved = (id: string) => {
    startTransition(async () => {
      const result = await deleteDetailPage(id)
      if (result.success) {
        setSavedPages((current) => current.filter((page) => page.id !== id))
        toast.success('저장된 초안을 삭제했습니다.')
      } else toast.error(result.error || '삭제에 실패했습니다.')
    })
  }

  const handleCopy = async (field: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedField(field)
    toast.success('클립보드에 복사했습니다.')
    window.setTimeout(() => setCopiedField(null), 1800)
  }

  const moveSection = (section: SectionId, direction: -1 | 1) => {
    setSectionOrder((current) => {
      const index = current.indexOf(section)
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const toggleSection = (section: SectionId) => {
    setHiddenSections((current) =>
      current.includes(section) ? current.filter((item) => item !== section) : [...current, section]
    )
  }

  const updateText = (field: keyof GeneratedContent, value: string) => {
    setGenerated((current) => ({ ...current, [field]: value }))
  }

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => {
    const toneClass = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'
    return (
      <div className="text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-current text-sm font-bold ${toneClass}`}>
          {score}
        </div>
        <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  const renderSection = (section: SectionId) => {
    if (hiddenSections.includes(section)) return null
    if (section === 'hero') return (
      <section key={section} className="bg-gradient-to-br from-primary/20 to-violet-500/15 px-6 py-14 text-center sm:px-10">
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('heroKicker', event.currentTarget.textContent || '')} className="text-xs font-bold uppercase tracking-[0.2em] text-primary outline-none">{generated.heroKicker}</p>
        <h1 contentEditable suppressContentEditableWarning onBlur={(event) => updateText('title', event.currentTarget.textContent || '')} className="mt-3 text-3xl font-black leading-tight outline-none sm:text-4xl">{generated.title}</h1>
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('targetAudience', event.currentTarget.textContent || '')} className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground outline-none">{generated.targetAudience}</p>
        {selectedProduct && <p className="mt-5 text-2xl font-bold">{selectedProduct.price.toLocaleString('ko-KR')}원</p>}
      </section>
    )
    if (section === 'problem') return (
      <section key={section} className="bg-muted/50 px-6 py-12 sm:px-10">
        <span className="text-xs font-bold tracking-widest text-primary">WHY THIS</span>
        <h2 contentEditable suppressContentEditableWarning onBlur={(event) => updateText('problemTitle', event.currentTarget.textContent || '')} className="mt-3 text-2xl font-bold outline-none">{generated.problemTitle}</h2>
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('problemBody', event.currentTarget.textContent || '')} className="mt-4 leading-7 text-muted-foreground outline-none">{generated.problemBody}</p>
      </section>
    )
    if (section === 'features') return (
      <section key={section} className="px-6 py-12 sm:px-10">
        <span className="text-xs font-bold tracking-widest text-primary">KEY BENEFITS</span>
        <h2 className="mt-3 text-2xl font-bold">고객이 바로 이해하는 핵심 장점</h2>
        <div className="mt-7 divide-y">
          {generated.features.map((feature, index) => (
            <div key={`${feature}-${index}`} className="grid grid-cols-[40px_1fr] gap-3 py-5">
              <b className="text-primary">0{index + 1}</b>
              <p contentEditable suppressContentEditableWarning onBlur={(event) => setGenerated((current) => ({ ...current, features: current.features.map((item, itemIndex) => itemIndex === index ? event.currentTarget.textContent || '' : item) }))} className="font-semibold outline-none">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    )
    if (section === 'comparison') return (
      <section key={section} className="bg-slate-950 px-6 py-12 text-white sm:px-10">
        <span className="text-xs font-bold tracking-widest text-primary">COMPARE</span>
        <h2 contentEditable suppressContentEditableWarning onBlur={(event) => updateText('comparisonTitle', event.currentTarget.textContent || '')} className="mt-3 text-2xl font-bold outline-none">{generated.comparisonTitle}</h2>
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('comparisonBody', event.currentTarget.textContent || '')} className="mt-4 leading-7 text-slate-300 outline-none">{generated.comparisonBody}</p>
      </section>
    )
    if (section === 'proof') return (
      <section key={section} className="border-y border-primary/15 bg-primary/5 px-6 py-12 sm:px-10">
        <span className="text-xs font-bold tracking-widest text-primary">CHECKED & CLEAR</span>
        <h2 contentEditable suppressContentEditableWarning onBlur={(event) => updateText('proofTitle', event.currentTarget.textContent || '')} className="mt-3 text-2xl font-bold outline-none">{generated.proofTitle}</h2>
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('proofBody', event.currentTarget.textContent || '')} className="mt-4 leading-7 text-muted-foreground outline-none">{generated.proofBody}</p>
      </section>
    )
    if (section === 'faq') return (
      <section key={section} className="px-6 py-12 sm:px-10">
        <span className="text-xs font-bold tracking-widest text-primary">FAQ</span>
        <div className="mt-5 space-y-3">
          {generated.faq.map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-xl border p-4">
              <p className="font-semibold">Q. {item.question}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    )
    return (
      <section key={section} className="bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10">
        <p contentEditable suppressContentEditableWarning onBlur={(event) => updateText('ctaText', event.currentTarget.textContent || '')} className="text-lg font-semibold outline-none">{generated.ctaText}</p>
        <h2 className="mt-3 text-2xl font-black">{generated.title}</h2>
      </section>
    )
  }

  return (
    <div className="space-y-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="create"><Sparkles className="mr-2 h-4 w-4" />AI 제작</TabsTrigger>
            <TabsTrigger value="analyze"><Search className="mr-2 h-4 w-4" />기존 페이지 진단</TabsTrigger>
            <TabsTrigger value="saved"><FileText className="mr-2 h-4 w-4" />저장함 {savedPages.length > 0 && `(${savedPages.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-5">
            <Card>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label>벤치마킹 프로젝트</Label>
                  <Select value={selectedSessionId || 'none'} onValueChange={(value) => void loadSessionContext(value)}>
                    <SelectTrigger><SelectValue placeholder="프로젝트를 선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">프로젝트 없이 시작</SelectItem>
                      {sessions.filter((session) => session.status === 'active').map((session) => <SelectItem key={session.id} value={session.id}>{session.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>내 상품</Label>
                  <Select value={selectedProductId} onValueChange={(value) => applyProduct(value)}>
                    <SelectTrigger><SelectValue placeholder="상품을 선택하세요" /></SelectTrigger>
                    <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-xs text-muted-foreground">
                  {isContextLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSearch className="h-4 w-4" />}
                  {sessionContext ? `${sessionContext.pages.length} 페이지 · ${sessionContext.checklists.length + sessionContext.memos.length} 인사이트` : '연결된 조사 없음'}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-5">
                <Card>
                  <CardHeader className="border-b py-4"><CardTitle className="text-base">제작 브리프</CardTitle></CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-2"><Label>상품명 · 핵심 키워드 *</Label><Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="예: 저소음 휴대용 선풍기" /></div>
                    <div className="space-y-2"><Label>핵심 고객</Label><Textarea value={audience} onChange={(event) => setAudience(event.target.value)} rows={2} placeholder="예: 출퇴근 중 빠르게 더위를 식히고 싶은 직장인" /></div>
                    <div className="space-y-2"><Label>검증 가능한 근거</Label><Textarea value={proof} onChange={(event) => setProof(event.target.value)} rows={2} placeholder="인증, 시험 수치, 소재, A/S 등 확인된 사실만 입력" /><p className="text-[11px] text-muted-foreground">입력하지 않은 인증이나 수치는 AI가 만들어내지 않도록 제한합니다.</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>카테고리</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="electronics">전자제품</SelectItem><SelectItem value="fashion">패션</SelectItem><SelectItem value="home">홈/리빙</SelectItem><SelectItem value="beauty">뷰티</SelectItem><SelectItem value="food">식품</SelectItem><SelectItem value="other">기타</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>표현 톤</Label><Select value={tone} onValueChange={setTone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional">전문적</SelectItem><SelectItem value="friendly">친근한</SelectItem><SelectItem value="luxury">고급스러운</SelectItem><SelectItem value="casual">활기찬</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"><div><p className="text-sm font-medium">검색 키워드 최적화</p><p className="text-xs text-muted-foreground">자연스러운 범위에서 제목에 반영</p></div><Switch checked={seoEnabled} onCheckedChange={setSeoEnabled} /></div>
                    {benchmarkBrief && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><Lightbulb className="h-3.5 w-3.5" />자동 반영할 조사 브리프</p><p className="line-clamp-6 whitespace-pre-line text-xs leading-5 text-muted-foreground">{benchmarkBrief}</p></div>}
                    <Button className="h-11 w-full" onClick={() => void handleGenerate()} disabled={isGenerating}>{isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}{isGenerating ? '구조와 문구 생성 중...' : generated.title ? '새 초안 다시 생성' : '판매페이지 초안 생성'}</Button>
                  </CardContent>
                </Card>

                {generated.title && <Card><CardHeader className="border-b py-4"><CardTitle className="text-base">섹션 순서와 노출</CardTitle></CardHeader><CardContent className="space-y-2 pt-4">{sectionOrder.map((section, index) => <div key={section} className={`flex items-center gap-1 rounded-lg border p-2 ${hiddenSections.includes(section) ? 'opacity-50' : ''}`}><span className="flex-1 text-sm font-medium">{sectionLabels[section]}</span><Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveSection(section, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === sectionOrder.length - 1} onClick={() => moveSection(section, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSection(section)}>{hiddenSections.includes(section) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button></div>)}</CardContent></Card>}
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between border-b py-3">
                  <div><CardTitle className="text-base">판매페이지 미리보기</CardTitle><p className="mt-1 text-xs text-muted-foreground">생성된 문구를 클릭하면 바로 수정할 수 있습니다.</p></div>
                  {generated.title && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => void handleCopy('all', generated.description)}>{copiedField === 'all' ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}설명 복사</Button><Button size="sm" onClick={handleSave} disabled={isPending}><Save className="mr-1.5 h-4 w-4" />저장</Button></div>}
                </CardHeader>
                <CardContent className="bg-muted/30 p-3 sm:p-5">
                  {!generated.title ? <div className="flex min-h-[560px] flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center"><Sparkles className="mb-4 h-12 w-12 text-muted-foreground/30" /><h3 className="font-semibold">조사에서 제작까지 한 흐름으로</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">프로젝트와 상품을 선택한 뒤 초안을 생성하면 섹션형 판매페이지가 여기에 표시됩니다.</p></div> : <article className="mx-auto max-w-[760px] overflow-hidden rounded-xl border bg-background shadow-sm">{sectionOrder.map(renderSection)}</article>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyze">
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <Card><CardHeader className="border-b py-4"><CardTitle className="text-base">진단할 상품</CardTitle></CardHeader><CardContent className="space-y-5 pt-5"><div className="space-y-2"><Label>내 상품</Label><Select value={selectedProductId} onValueChange={(value) => applyProduct(value)}><SelectTrigger><SelectValue placeholder="상품을 선택하세요" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>{selectedProduct && <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted"><Package className="h-6 w-6 text-muted-foreground" /></div>}<div className="min-w-0"><p className="line-clamp-2 text-sm font-medium">{selectedProduct.name}</p><p className="mt-1 text-xs text-muted-foreground">{selectedProduct.category || '카테고리 없음'}</p><p className="mt-1 text-sm font-semibold">{selectedProduct.price.toLocaleString('ko-KR')}원</p></div></div>}<Button className="h-11 w-full" onClick={() => void handleAnalyze()} disabled={!selectedProduct || isAnalyzing}>{isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}{isAnalyzing ? '진단 중...' : '페이지 진단 시작'}</Button></CardContent></Card>
              <Card><CardHeader className="border-b py-4"><CardTitle className="text-base">진단 결과</CardTitle></CardHeader><CardContent className="pt-6">{!analysisResult ? <div className="flex min-h-[440px] flex-col items-center justify-center text-center"><Search className="mb-4 h-12 w-12 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">상품을 선택하면 SEO·전환·가독성을 진단합니다.</p></div> : <div className="space-y-6"><div className="grid grid-cols-4 gap-2"><ScoreCircle score={analysisResult.overallScore} label="종합" /><ScoreCircle score={analysisResult.seoScore} label="SEO" /><ScoreCircle score={analysisResult.conversionScore} label="전환" /><ScoreCircle score={analysisResult.readabilityScore} label="가독성" /></div><div className="grid gap-3 md:grid-cols-2">{analysisResult.improvements.map((item, index) => <div key={index} className="rounded-xl border p-4"><div className="flex items-center justify-between"><Badge variant="outline">{item.category}</Badge><Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>{item.priority === 'high' ? '우선' : item.priority === 'medium' ? '중요' : '참고'}</Badge></div><p className="mt-3 text-sm font-semibold">{item.issue}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.suggestion}</p></div>)}</div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />추천 제목</p><p className="mt-2 text-sm">{analysisResult.suggestedTitle}</p></div><Button onClick={applyAnalysis}><Sparkles className="mr-2 h-4 w-4" />추천안으로 판매페이지 만들기</Button></div>}</CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <Card><CardHeader className="border-b"><CardTitle>저장된 판매페이지</CardTitle></CardHeader><CardContent className="p-4">{savedPages.length === 0 ? <div className="py-16 text-center"><FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">아직 저장된 초안이 없습니다.</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{savedPages.map((page) => <div key={page.id} className="rounded-xl border p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 font-semibold">{page.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(page.createdAt).toLocaleString('ko-KR')}</p></div><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => handleDeleteSaved(page.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mt-3 flex flex-wrap gap-1">{page.userInputs.category && <Badge variant="secondary">{page.userInputs.category}</Badge>}{page.userInputs.tone && <Badge variant="outline">{page.userInputs.tone}</Badge>}</div>{page.contentHtml && <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => void handleCopy(`saved-${page.id}`, page.contentHtml!)}>{copiedField === `saved-${page.id}` ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}HTML 복사</Button>}</div>)}</div>}</CardContent></Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
