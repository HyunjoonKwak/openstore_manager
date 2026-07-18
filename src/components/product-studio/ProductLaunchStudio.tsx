'use client'
/* eslint-disable @next/next/no-img-element -- 시장 상품과 사용자가 제공한 제작 이미지를 표시합니다. */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Download,
  ExternalLink,
  ImagePlus,
  Lightbulb,
  ListChecks,
  Loader2,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface MarketProduct {
  rank: number
  product_id: string
  title: string
  price: number
  mall_name: string
  url: string
  image_url?: string
  brand?: string
  maker?: string
  category?: string[]
  review_count?: number
  purchase_count?: number
}

interface CommerceCategory {
  id: string
  name: string
  wholeCategoryName: string
  last: boolean
}

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

type PatternId = 'hero' | 'benefit' | 'usage' | 'comparison' | 'proof' | 'faq' | 'cta'
type Stage = 1 | 2 | 3 | 4 | 5

const stageItems: Array<{ id: Stage; label: string; description: string }> = [
  { id: 1, label: '상품군 조사', description: '검색 조건과 가격분포' },
  { id: 2, label: 'TOP 10', description: '공개 신호로 후보 선정' },
  { id: 3, label: '장점 분석', description: '설득 원리 선택' },
  { id: 4, label: '상세 제작', description: '내 상품으로 재구성' },
  { id: 5, label: '검수 · 게시', description: '스마트스토어 등록' },
]

const categoryLevelLabels = ['대분류', '중분류', '소분류', '세분류']

const patternOptions: Array<{ id: PatternId; label: string; description: string }> = [
  { id: 'hero', label: '첫 화면', description: '한눈에 이해되는 핵심 메시지' },
  { id: 'benefit', label: '장점 표현', description: '기능을 고객 효익으로 바꾸는 방식' },
  { id: 'usage', label: '사용 장면', description: '고객이 자신을 대입하게 만드는 흐름' },
  { id: 'comparison', label: '비교 구성', description: '구매 기준을 명확히 보여주는 방식' },
  { id: 'proof', label: '근거 · 신뢰', description: '인증과 검증 자료의 배치 원리' },
  { id: 'faq', label: 'FAQ', description: '구매 전 불안을 미리 해소하는 방식' },
  { id: 'cta', label: '구매 유도', description: '결정 직전 메시지와 정보 배치' },
]

const strengthRules = [
  { words: ['냉각', '아이스', '쿨'], label: '즉각적인 체감 효익' },
  { words: ['저소음', 'BLDC'], label: '성능의 구체화' },
  { words: ['접이식', '포켓', '미니', '휴대'], label: '사용 장면 제안' },
  { words: ['대용량', '4000mAh', '5000mAh'], label: '불안 요소 해소' },
  { words: ['공식', '정품', '국내'], label: '신뢰 장치' },
  { words: ['업그레이드', '신형', '26년'], label: '신제품 명분' },
]

const emptyGenerated: GeneratedContent = {
  title: '', heroKicker: '', targetAudience: '', problemTitle: '', problemBody: '', features: [],
  comparisonTitle: '', comparisonBody: '', proofTitle: '', proofBody: '', faq: [], ctaText: '', description: '',
}

function cleanTitle(value: string) {
  return value.replace(/<[^>]+>/g, '').replaceAll('&quot;', '"').replaceAll('&amp;', '&').trim()
}

function formatWon(value: number) {
  return `${Math.round(value || 0).toLocaleString('ko-KR')}원`
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * ratio
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function popularityScore(product: MarketProduct) {
  if (product.purchase_count) {
    return Math.round(Math.min(99, 80 + Math.log10(product.purchase_count + 1) * 4))
  }
  if (product.review_count) {
    return Math.round(Math.min(79, 55 + Math.log10(product.review_count + 1) * 5))
  }
  return Math.round(Math.max(30, 55 - (product.rank - 1) * 1.25))
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character)
}

function buildDetailHtml(content: GeneratedContent, price: number, imageSource: string) {
  const image = imageSource
    ? `<img src="${imageSource}" alt="${escapeHtml(content.title)}" style="display:block;width:100%;height:auto" />`
    : ''
  const features = content.features.map((feature, index) =>
    `<div style="display:grid;grid-template-columns:44px 1fr;gap:12px;padding:24px 0;border-top:1px solid #e5e7eb"><b style="color:#16a34a">0${index + 1}</b><p style="margin:0;font-weight:700">${escapeHtml(feature)}</p></div>`
  ).join('')
  const faq = content.faq.map((item) =>
    `<div style="padding:20px;border:1px solid #e5e7eb;border-radius:12px;margin-top:12px"><b>Q. ${escapeHtml(item.question)}</b><p>${escapeHtml(item.answer)}</p></div>`
  ).join('')

  return `<div style="max-width:860px;margin:0 auto;font-family:Arial,sans-serif;color:#111">${image}
  <section style="padding:72px 40px;text-align:center;background:#ecfdf5"><p style="font-weight:700;color:#16a34a">${escapeHtml(content.heroKicker)}</p><h1 style="font-size:44px;line-height:1.18;margin:14px 0">${escapeHtml(content.title)}</h1><p>${escapeHtml(content.targetAudience)}</p><b style="display:block;margin-top:20px;font-size:26px">${formatWon(price)}</b></section>
  <section style="padding:64px 40px;background:#f8fafc"><h2>${escapeHtml(content.problemTitle)}</h2><p style="line-height:1.8">${escapeHtml(content.problemBody)}</p></section>
  <section style="padding:64px 40px"><h2>고객이 바로 이해하는 핵심 장점</h2>${features}</section>
  <section style="padding:64px 40px;background:#111827;color:white"><h2>${escapeHtml(content.comparisonTitle)}</h2><p style="line-height:1.8;color:#d1d5db">${escapeHtml(content.comparisonBody)}</p></section>
  <section style="padding:64px 40px;background:#f0fdf4"><h2>${escapeHtml(content.proofTitle)}</h2><p style="line-height:1.8">${escapeHtml(content.proofBody)}</p></section>
  <section style="padding:64px 40px"><h2>FAQ</h2>${faq}</section>
  <section style="padding:56px 40px;text-align:center;background:#22c55e;color:white"><p>${escapeHtml(content.ctaText)}</p><h2>${escapeHtml(content.title)}</h2></section></div>`
}

export function ProductLaunchStudio() {
  const [stage, setStage] = useState<Stage>(1)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('40')
  const [products, setProducts] = useState<MarketProduct[]>([])
  const [showAllCandidates, setShowAllCandidates] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [patterns, setPatterns] = useState<Record<string, PatternId[]>>({})
  const [isSearching, setIsSearching] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('상품군과 검색어를 입력해 새 조사를 시작하세요.')
  const [manualRows, setManualRows] = useState('')
  const [inputMode, setInputMode] = useState<'search' | 'manual'>('search')
  const [categoryLevels, setCategoryLevels] = useState<CommerceCategory[][]>([])
  const [categoryPath, setCategoryPath] = useState<CommerceCategory[]>([])
  const [categoryMessage, setCategoryMessage] = useState('네이버 카테고리 연결을 확인하고 있습니다.')
  const [categoryLoadingLevel, setCategoryLoadingLevel] = useState<number | null>(null)
  const [generated, setGenerated] = useState<GeneratedContent>(emptyGenerated)
  const [productName, setProductName] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [audience, setAudience] = useState('')
  const [proof, setProof] = useState('')
  const [tone, setTone] = useState('professional')
  const [imageData, setImageData] = useState('')
  const [imageRightsConfirmed, setImageRightsConfirmed] = useState(false)
  const [templateProductNo, setTemplateProductNo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stock, setStock] = useState('100')
  const [commerceConfigured, setCommerceConfigured] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('')
  const [publishConfirmed, setPublishConfirmed] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadCategoryLevel(undefined, 0, [])
    const saved = window.localStorage.getItem('product-launch-studio')
    if (!saved) return
    try {
      const value = JSON.parse(saved) as Record<string, unknown>
      if (typeof value.keyword === 'string') setKeyword(value.keyword)
      if (typeof value.category === 'string') setCategory(value.category)
      if (typeof value.productName === 'string') setProductName(value.productName)
      if (typeof value.salePrice === 'string') setSalePrice(value.salePrice)
      if (typeof value.audience === 'string') setAudience(value.audience)
      if (typeof value.proof === 'string') setProof(value.proof)
    } catch {
      // 손상된 로컬 초안은 무시합니다.
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('product-launch-studio', JSON.stringify({
      keyword, category, productName, salePrice, audience, proof,
    }))
  }, [keyword, category, productName, salePrice, audience, proof])

  useEffect(() => {
    if (stage !== 5) return
    fetch('/api/commerce/status')
      .then((response) => response.json())
      .then((data) => setCommerceConfigured(Boolean(data.configured)))
      .catch(() => setCommerceConfigured(false))
  }, [stage])

  const prices = useMemo(() => products.map((product) => product.price).filter((price) => price > 0), [products])
  const stats = useMemo(() => ({
    low: prices.length ? Math.min(...prices) : 0,
    q1: percentile(prices, 0.25),
    median: percentile(prices, 0.5),
    q3: percentile(prices, 0.75),
    high: prices.length ? Math.max(...prices) : 0,
  }), [prices])

  const rankedProducts = useMemo(
    () => [...products].sort((a, b) => popularityScore(b) - popularityScore(a)),
    [products]
  )
  const selectedProducts = useMemo(
    () => rankedProducts.filter((product) => selectedIds.includes(product.product_id)).slice(0, 10),
    [rankedProducts, selectedIds]
  )
  const selectedPatternIds = useMemo(
    () => Array.from(new Set(selectedProducts.flatMap((product) => patterns[product.product_id] || []))),
    [patterns, selectedProducts]
  )
  const histogram = useMemo(() => {
    if (!prices.length) return []
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const step = Math.max(1, (max - min) / 5)
    return Array.from({ length: 5 }, (_, index) => {
      const start = min + step * index
      const end = index === 4 ? max + 1 : min + step * (index + 1)
      return {
        label: `${Math.round(start / 1000)}~${Math.round(end / 1000)}천`,
        count: prices.filter((price) => price >= start && price < end).length,
      }
    })
  }, [prices])

  async function loadCategoryLevel(parentId: string | undefined, level: number, nextPath: CommerceCategory[]) {
    setCategoryLoadingLevel(level)
    try {
      const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''
      const response = await fetch(`/api/commerce/categories${query}`)
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message || '카테고리를 불러오지 못했습니다.')
      setCategoryLevels((current) => [...current.slice(0, level), data.items])
      setCategoryPath(nextPath)
      setCategoryMessage('대분류부터 판매할 상품의 최종 분류까지 선택하세요.')
    } catch (error) {
      setCategoryMessage(error instanceof Error ? `${error.message} 직접 입력으로 계속할 수 있습니다.` : '상품군을 직접 입력해주세요.')
    } finally {
      setCategoryLoadingLevel(null)
    }
  }

  function selectCategory(level: number, categoryValue: string) {
    const selected = categoryLevels[level]?.find((item) => item.id === categoryValue)
    if (!selected) return
    const nextPath = [...categoryPath.slice(0, level), selected]
    setCategoryPath(nextPath)
    setCategory(selected.wholeCategoryName || nextPath.map((item) => item.name).join(' > '))
    setCategoryLevels((current) => current.slice(0, level + 1))
    if (selected.last) {
      setCategoryId(selected.id)
      setCategoryMessage(`최종 카테고리 선택 완료 · ${selected.id}`)
      return
    }
    void loadCategoryLevel(selected.id, level + 1, nextPath)
  }

  async function runResearch() {
    if (keyword.trim().length < 2) {
      toast.error('검색어를 두 글자 이상 입력해주세요.')
      return
    }
    setIsSearching(true)
    setMessage('네이버 쇼핑 공개 노출 상품을 조사하고 있습니다.')
    try {
      const response = await fetch(`/api/market-research?q=${encodeURIComponent(keyword.trim())}&limit=${limit}`)
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error(data.message || '검색 결과가 없습니다.')
      }
      const normalized: MarketProduct[] = data.items.map((item: Record<string, unknown>, index: number) => ({
        rank: Number(item.rank || index + 1),
        product_id: String(item.product_id || item.productId || `market-${index}`),
        title: cleanTitle(String(item.title || '상품명 없음')),
        price: Number(item.price || item.lprice || 0),
        mall_name: String(item.mall_name || item.mallName || '판매처 정보 없음'),
        url: String(item.url || item.link || '#'),
        image_url: item.image_url || item.image ? String(item.image_url || item.image) : undefined,
        brand: item.brand ? String(item.brand) : undefined,
        maker: item.maker ? String(item.maker) : undefined,
        category: Array.isArray(item.category) ? item.category.map(String) : undefined,
        review_count: Number(item.review_count || 0) || undefined,
        purchase_count: Number(item.purchase_count || 0) || undefined,
      })).filter((item: MarketProduct) => item.price > 0)
      setProducts(normalized)
      setShowAllCandidates(false)
      const autoTop = [...normalized].sort((a, b) => popularityScore(b) - popularityScore(a)).slice(0, 10)
      setSelectedIds(autoTop.map((item) => item.product_id))
      setSalePrice(String(Math.round(percentile(normalized.map((item) => item.price), 0.5) / 100) * 100))
      setMessage(`${normalized.length}개 상품을 불러왔습니다. TOP 10은 판매량 확정값이 아닌 공개 신호 기반 추정입니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '상품 조사에 실패했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  function importProducts() {
    const parsed = manualRows.split('\n').map((line, index) => {
      const cells = line.split(/\t|,/).map((cell) => cell.trim())
      const price = Number((cells[1] || '').replace(/[^0-9]/g, ''))
      if (!cells[0] || !price) return null
      return {
        rank: index + 1,
        product_id: `manual-${index + 1}`,
        title: cells[0],
        price,
        mall_name: cells[2] || '직접 입력',
        url: cells[3] || '#',
      } satisfies MarketProduct
    }).filter((item): item is MarketProduct => item !== null)
    if (!parsed.length) return toast.error('가져올 수 있는 상품 행이 없습니다.')
    setProducts(parsed)
    setShowAllCandidates(false)
    setSelectedIds(parsed.slice(0, 10).map((item) => item.product_id))
    setSalePrice(String(Math.round(percentile(parsed.map((item) => item.price), 0.5) / 100) * 100))
    setMessage(`${parsed.length}개 직접 입력 상품을 가져왔습니다.`)
  }

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId)
      if (current.length >= 10) {
        toast.error('분석 대상은 최대 10개까지 선택할 수 있습니다.')
        return current
      }
      return [...current, productId]
    })
  }

  function togglePattern(productId: string, patternId: PatternId) {
    setPatterns((current) => {
      const selected = current[productId] || []
      return {
        ...current,
        [productId]: selected.includes(patternId)
          ? selected.filter((item) => item !== patternId)
          : [...selected, patternId],
      }
    })
  }

  async function generatePage() {
    if (!selectedProducts.length) return toast.error('분석할 상품을 먼저 선택해주세요.')
    if (!productName.trim()) setProductName(keyword.trim())
    setIsGenerating(true)
    try {
      const benchmarkContext = [
        `조사 상품군: ${category || '미입력'}`,
        `검색어: ${keyword}`,
        `가격 분포: 최저 ${formatWon(stats.low)}, 중앙 ${formatWon(stats.median)}, 상위 25% 시작 ${formatWon(stats.q3)}`,
        '공개 신호 상위 후보:',
        ...selectedProducts.map((product, index) => `${index + 1}. ${product.title} / ${formatWon(product.price)} / ${product.mall_name} / 추정점수 ${popularityScore(product)}`),
        `선택한 설득 원리: ${selectedPatternIds.map((id) => patternOptions.find((item) => item.id === id)?.label).filter(Boolean).join(', ') || '선택 없음'}`,
      ].join('\n')

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: productName.trim() || keyword.trim(),
          category: category || 'other',
          tone,
          audience,
          proof,
          benchmarkContext,
          options: { seo: true },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '상세페이지 생성에 실패했습니다.')
      setGenerated({ ...emptyGenerated, ...data, features: data.features || [], faq: data.faq || [] })
      setProductName(data.title || productName || keyword)
      if (!audience) setAudience(data.targetAudience || '')
      setStage(4)
      toast.success('시장 조사 근거로 상세페이지 초안을 만들었습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상세페이지 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/bmp'].includes(file.type)) {
      toast.error('JPG, PNG, GIF 또는 BMP 이미지를 사용해주세요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('이미지는 10MB 이하여야 합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageData(String(reader.result || ''))
      setImageRightsConfirmed(false)
    }
    reader.readAsDataURL(file)
  }

  async function testCommerceConnection() {
    setConnectionMessage('네이버 인증을 확인하고 있습니다.')
    try {
      const response = await fetch('/api/commerce/test', { method: 'POST' })
      const data = await response.json()
      setConnectionMessage(response.ok ? '네이버 커머스 API 인증에 성공했습니다.' : data.message || '연결에 실패했습니다.')
      if (response.ok) setCommerceConfigured(true)
    } catch {
      setConnectionMessage('연결 확인 요청을 처리하지 못했습니다.')
    }
  }

  const validation = [
    { label: '상품명과 판매가', ok: Boolean(productName.trim() && Number(salePrice) > 0) },
    { label: 'AI 상세페이지 초안', ok: Boolean(generated.title) },
    { label: '검증 근거 입력', ok: proof.trim().length > 10 },
    { label: '게시용 제품 이미지', ok: Boolean(imageData) },
    { label: '이미지 상업 사용 권리', ok: imageRightsConfirmed },
    { label: '같은 상품군 템플릿', ok: /^\d+$/.test(templateProductNo) },
    { label: '리프 카테고리 ID', ok: Boolean(categoryId.trim()) },
    { label: '커머스 API 설정', ok: commerceConfigured },
  ]
  const readyToPublish = validation.every((item) => item.ok) && publishConfirmed

  function downloadPackage() {
    const publishContent = { ...generated, title: productName, proofBody: proof || generated.proofBody }
    const detailContent = buildDetailHtml(publishContent, Number(salePrice), '__PRODUCT_IMAGE_URL__')
    const payload = {
      project: { keyword, category, generatedAt: new Date().toISOString(), rankingMethod: 'purchase_count > review_count > exposure_rank' },
      product: { name: productName, price: Number(salePrice), stock: Number(stock), categoryId, templateProductNo, audience, proof },
      detailContent,
      selectedPrinciples: selectedPatternIds,
      benchmark: selectedProducts.map((product) => ({ ...product, signalScore: popularityScore(product) })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${productName || 'smartstore'}-publish-package.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function publishProduct() {
    if (!readyToPublish || isPublishing) return
    setIsPublishing(true)
    setPublishMessage('대표 이미지를 업로드하고 스마트스토어 상품을 등록하고 있습니다.')
    try {
      const response = await fetch('/api/commerce/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: 'PUBLISH', templateProductNo, name: productName,
          price: Number(salePrice), stock: Number(stock), categoryId,
          detailContent: buildDetailHtml(
            { ...generated, title: productName, proofBody: proof || generated.proofBody },
            Number(salePrice),
            '__PRODUCT_IMAGE_URL__'
          ),
          imageData,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const details = Array.isArray(data.invalidInputs)
          ? data.invalidInputs.map((item: { message?: string }) => item.message).filter(Boolean).join(' / ')
          : ''
        throw new Error([data.message, details].filter(Boolean).join(' — '))
      }
      setPublishMessage(`게시 완료 · 스마트스토어 상품번호 ${data.smartstoreChannelProductNo || data.originProductNo}`)
      toast.success('스마트스토어 상품 게시를 완료했습니다.')
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : '상품 게시를 완료하지 못했습니다.')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-emerald-500/20">
        <CardContent className="grid gap-2 p-3 md:grid-cols-5">
          {stageItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStage(item.id)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                stage === item.id ? 'border-emerald-500 bg-emerald-500/10' : item.id < stage ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-card'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-600">0{item.id}</span>
              <p className="mt-1 text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {stage === 1 && (
        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-emerald-600" />조사 조건</CardTitle></CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <Button variant={inputMode === 'search' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('search')}>자동 검색</Button>
                <Button variant={inputMode === 'manual' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('manual')}>직접 가져오기</Button>
              </div>

              {inputMode === 'search' ? (
                <>
                  <div className="space-y-2">
                    <Label>네이버 분류로 상품군 찾기</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryLevels.map((items, level) => (
                        <Select key={level} value={categoryPath[level]?.id || ''} onValueChange={(value) => selectCategory(level, value)}>
                          <SelectTrigger><SelectValue placeholder={categoryLoadingLevel === level ? '불러오는 중' : categoryLevelLabels[level] || `${level + 1}단계`} /></SelectTrigger>
                          <SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ))}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{categoryMessage}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="launch-category">상품군 직접 입력</Label>
                    <Input id="launch-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="예: 디지털/가전 > 계절가전 > 휴대용 선풍기" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="launch-keyword">이번에 조사할 검색어 *</Label>
                    <Input id="launch-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void runResearch()} placeholder="예: 저소음 휴대용 선풍기" />
                    <p className="text-xs text-muted-foreground">판매할 상품이 바뀔 때마다 자유롭게 다시 입력할 수 있습니다.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>조사 상품 수</Label>
                    <Select value={limit} onValueChange={setLimit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="20">20개</SelectItem><SelectItem value="30">30개</SelectItem><SelectItem value="40">40개</SelectItem></SelectContent></Select>
                  </div>
                  <Button className="h-11 w-full" onClick={() => void runResearch()} disabled={isSearching}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {isSearching ? '시장 조사 중...' : '가격과 인기 후보 조사'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2"><Label>상품명, 가격, 판매처, URL</Label><Textarea rows={12} value={manualRows} onChange={(event) => setManualRows(event.target.value)} placeholder={'휴대용 선풍기 A,29900,판매처,https://...\n휴대용 선풍기 B,35900,판매처,https://...'} /></div>
                  <Button className="w-full" onClick={importProducts}><Upload className="mr-2 h-4 w-4" />직접 입력 데이터 가져오기</Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                {[['최저가', stats.low], ['하위 25%', stats.q1], ['중앙값', stats.median], ['상위 25%', stats.q3], ['최고가', stats.high]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{formatWon(Number(value))}</p></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle>가격분포</CardTitle><p className="mt-1 text-sm text-muted-foreground">{message}</p></div><Badge variant="secondary">{products.length}개 상품</Badge></CardHeader>
              <CardContent className="pt-6">
                {histogram.length ? (
                  <div className="flex h-56 items-end gap-3">
                    {histogram.map((bucket) => {
                      const maxCount = Math.max(...histogram.map((item) => item.count), 1)
                      return <div key={bucket.label} className="flex h-full flex-1 flex-col justify-end"><div className="mb-2 text-center text-xs font-semibold">{bucket.count}</div><div className="rounded-t-lg bg-emerald-500/80" style={{ height: `${Math.max(8, bucket.count / maxCount * 100)}%` }} /><p className="mt-2 text-center text-[10px] text-muted-foreground">{bucket.label}</p></div>
                    })}
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed text-center"><BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">조사를 시작하면 가격분포가 표시됩니다.</p></div>
                )}
              </CardContent>
            </Card>
            {products.length > 0 && <Button className="w-full" onClick={() => setStage(2)}>TOP 10 후보 확인 <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          </div>
        </div>
      )}

      {stage === 2 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" />예상 인기 TOP 10 선정</CardTitle><p className="mt-2 text-sm text-muted-foreground">정확한 판매량이 아니라 공개 구매수, 리뷰수, 검색 노출순위를 조합한 추정 결과입니다. 직접 후보를 바꿀 수 있습니다.</p></div><Badge>{selectedIds.length}/10 선택</Badge></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(showAllCandidates ? rankedProducts : rankedProducts.slice(0, 15)).map((product, index) => {
                const selected = selectedIds.includes(product.product_id)
                return <div key={product.product_id} className={`grid gap-3 p-4 lg:grid-cols-[36px_56px_minmax(0,1fr)_150px_110px_90px] lg:items-center ${selected ? 'bg-emerald-500/5' : ''}`}>
                  <Checkbox checked={selected} onCheckedChange={() => toggleProduct(product.product_id)} aria-label={`${product.title} 선택`} />
                  {product.image_url ? <img src={product.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted"><PackageSearch className="h-5 w-5 text-muted-foreground" /></div>}
                  <div className="min-w-0"><div className="flex items-center gap-2"><b className="text-xs text-emerald-600">#{index + 1}</b><p className="truncate font-semibold">{product.title}</p></div><p className="mt-1 text-xs text-muted-foreground">{product.mall_name}{product.brand ? ` · ${product.brand}` : ''}</p></div>
                  <div className="text-sm"><p className="font-semibold">{product.purchase_count ? `구매 ${product.purchase_count.toLocaleString()}+` : product.review_count ? `리뷰 ${product.review_count.toLocaleString()}개` : `노출 ${product.rank}위`}</p><p className="text-xs text-muted-foreground">핵심 공개 신호</p></div>
                  <p className="font-bold">{formatWon(product.price)}</p>
                  <Badge variant={popularityScore(product) >= 90 ? 'default' : 'secondary'} className="justify-center">추정 {popularityScore(product)}</Badge>
                </div>
              })}
            </div>
            {rankedProducts.length > 15 && (
              <div className="border-t bg-muted/20 p-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAllCandidates((current) => !current)}>
                  {showAllCandidates
                    ? '상위 15개만 보기'
                    : `후보 ${rankedProducts.length - 15}개 더 보기`}
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => setStage(1)}><ArrowLeft className="mr-2 h-4 w-4" />조건 수정</Button><Button onClick={() => setStage(3)} disabled={!selectedProducts.length}>선택한 {selectedProducts.length}개 장점 분석 <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </CardContent>
        </Card>
      )}

      {stage === 3 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-emerald-600" />페이지별 장점과 설득 원리</CardTitle><p className="text-sm text-muted-foreground">공개 제목·가격 신호를 1차 분석하고, 페이지를 직접 열어 참고할 구성만 선택하세요. 문구와 이미지는 복제하지 않습니다.</p></CardHeader>
            <CardContent className="divide-y p-0">
              {selectedProducts.map((product, index) => {
                const selected = patterns[product.product_id] || []
                const strengths = strengthRules.filter((rule) => rule.words.some((word) => product.title.includes(word))).slice(0, 3)
                return <div key={product.product_id} className="p-4">
                  <div className="flex gap-3">
                    <span className="text-xs font-black text-emerald-600">{String(index + 1).padStart(2, '0')}</span>
                    {product.image_url && <img src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1"><p className="font-semibold">{product.title}</p><p className="mt-1 text-xs text-muted-foreground">{product.mall_name} · {formatWon(product.price)}</p><div className="mt-2 flex flex-wrap gap-1">{(strengths.length ? strengths : [{ label: '검색 적합성' }]).map((strength) => <Badge key={strength.label} variant="secondary">{strength.label}</Badge>)}</div></div>
                    {product.url !== '#' && <Button variant="outline" size="sm" asChild><a href={product.url} target="_blank" rel="noreferrer">페이지 보기 <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">{patternOptions.map((option) => <Button key={option.id} variant={selected.includes(option.id) ? 'default' : 'outline'} size="sm" onClick={() => togglePattern(product.product_id, option.id)}>{selected.includes(option.id) && <Check className="mr-1.5 h-3.5 w-3.5" />}{option.label}</Button>)}</div>
                </div>
              })}
            </CardContent>
          </Card>
          <div className="space-y-5">
            <Card className="sticky top-4">
              <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" />내 제작 브리프</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-5">
                <p className="text-sm"><b>{selectedProducts.length}개 페이지</b>에서 <b>{selectedPatternIds.length}개 원리</b>를 선택했습니다.</p>
                <div className="space-y-2">{selectedPatternIds.length ? selectedPatternIds.map((id) => { const item = patternOptions.find((option) => option.id === id)!; return <div key={id} className="rounded-lg border p-3"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div> }) : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">왼쪽 상품에서 참고할 부분을 선택해주세요.</p>}</div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5"><b>독창성 원칙</b><p className="mt-1 text-muted-foreground">선택한 구조만 참고하고 내 제품의 실제 사진과 검증된 사실로 다시 작성합니다.</p></div>
                <div className="space-y-2"><Label>판매할 상품 가칭</Label><Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder={keyword || '예: 아이스포켓 터보팬'} /></div>
                <div className="space-y-2"><Label>핵심 고객</Label><Textarea rows={2} value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="예: 출퇴근 중 더위를 빠르게 식히고 싶은 직장인" /></div>
                <Button className="h-11 w-full" onClick={() => void generatePage()} disabled={isGenerating}>{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{isGenerating ? 'AI 초안 생성 중...' : '이 분석으로 상세페이지 제작'}</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {stage === 4 && (
        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card><CardHeader className="border-b"><CardTitle>내 상품 정보</CardTitle></CardHeader><CardContent className="space-y-4 pt-5">
              <div className="space-y-2"><Label>상품명</Label><Input value={productName} onChange={(event) => { setProductName(event.target.value); setGenerated((current) => ({ ...current, title: event.target.value })) }} /></div>
              <div className="space-y-2"><Label>판매가</Label><Input type="number" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /><p className="text-xs text-muted-foreground">시장 중앙값 {formatWon(stats.median)}를 참고하세요.</p></div>
              <div className="space-y-2"><Label>검증 가능한 근거·인증 *</Label><Textarea rows={3} value={proof} onChange={(event) => setProof(event.target.value)} placeholder="인증번호, 소재, 시험 수치, A/S 등 확인된 사실만 입력" /><p className="text-xs text-muted-foreground">확인되지 않은 숫자나 인증은 게시할 수 없습니다.</p></div>
              <div className="space-y-2"><Label>표현 톤</Label><Select value={tone} onValueChange={setTone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional">전문적이고 신뢰감 있게</SelectItem><SelectItem value="friendly">친근하고 쉽게</SelectItem><SelectItem value="luxury">고급스럽게</SelectItem><SelectItem value="casual">활기차고 트렌디하게</SelectItem></SelectContent></Select></div>
            </CardContent></Card>
            <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ImagePlus className="h-5 w-5" />게시용 제품 사진</CardTitle></CardHeader><CardContent className="space-y-4 pt-5">
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/bmp" onChange={handleImage} hidden />
              {imageData ? <img src={imageData} alt={productName} className="aspect-square w-full rounded-xl border object-contain" /> : <button type="button" onClick={() => imageInputRef.current?.click()} className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground"><ImagePlus className="mb-2 h-8 w-8" /><span className="text-sm">제품 원본 사진 추가</span></button>}
              <Button variant="outline" className="w-full" onClick={() => imageInputRef.current?.click()}>{imageData ? '사진 교체' : '사진 선택'}</Button>
              <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><Checkbox checked={imageRightsConfirmed} onCheckedChange={(checked) => setImageRightsConfirmed(checked === true)} /><span>직접 촬영했거나 이 이미지를 상업적으로 사용할 권리가 있습니다.</span></label>
            </CardContent></Card>
            <Button className="w-full" onClick={() => setStage(5)} disabled={!generated.title}>게시 전 검수로 이동 <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          <Card className="overflow-hidden"><CardHeader className="border-b"><CardTitle>모바일 상세페이지 미리보기</CardTitle><p className="text-sm text-muted-foreground">경쟁 이미지는 포함되지 않으며 제공한 제품 사진만 사용합니다.</p></CardHeader><CardContent className="bg-muted/30 p-3 sm:p-5">
            {!generated.title ? <div className="flex min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed bg-background"><Sparkles className="mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">장점 분석 단계에서 AI 초안을 생성해주세요.</p></div> : <article className="mx-auto max-w-[760px] overflow-hidden rounded-xl border bg-background shadow-sm">
              {imageData ? <img src={imageData} alt={productName} className="w-full" /> : <div className="flex h-72 items-center justify-center bg-muted"><div className="text-center"><ImagePlus className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">제품 사진을 추가해주세요</p></div></div>}
              <section className="bg-emerald-50 px-8 py-14 text-center"><p className="text-sm font-bold text-emerald-600">{generated.heroKicker}</p><h1 className="mt-3 text-3xl font-black">{generated.title}</h1><p className="mt-4 text-sm text-muted-foreground">{generated.targetAudience}</p><b className="mt-5 block text-2xl">{formatWon(Number(salePrice))}</b></section>
              <section className="bg-slate-50 px-8 py-12"><h2 className="text-2xl font-bold">{generated.problemTitle}</h2><p className="mt-4 leading-7 text-muted-foreground">{generated.problemBody}</p></section>
              <section className="px-8 py-12"><h2 className="text-2xl font-bold">고객이 이해하는 핵심 장점</h2><div className="mt-6 divide-y">{generated.features.map((feature, index) => <div key={`${feature}-${index}`} className="grid grid-cols-[40px_1fr] gap-3 py-5"><b className="text-emerald-600">0{index + 1}</b><p className="font-semibold">{feature}</p></div>)}</div></section>
              <section className="bg-slate-950 px-8 py-12 text-white"><h2 className="text-2xl font-bold">{generated.comparisonTitle}</h2><p className="mt-4 leading-7 text-slate-300">{generated.comparisonBody}</p></section>
              <section className="bg-emerald-50 px-8 py-12"><h2 className="text-2xl font-bold">{generated.proofTitle}</h2><p className="mt-4 leading-7 text-muted-foreground">{proof || generated.proofBody}</p></section>
              <section className="px-8 py-12"><h2 className="text-2xl font-bold">FAQ</h2>{generated.faq.map((item, index) => <div key={index} className="mt-3 rounded-xl border p-4"><b>Q. {item.question}</b><p className="mt-2 text-sm text-muted-foreground">{item.answer}</p></div>)}</section>
              <section className="bg-emerald-500 px-8 py-12 text-center text-white"><p>{generated.ctaText}</p><h2 className="mt-2 text-2xl font-black">{generated.title}</h2></section>
            </article>}
          </CardContent></Card>
        </div>
      )}

      {stage === 5 && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <Card><CardHeader className="flex-row items-center justify-between border-b"><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />게시 전 검수</CardTitle><Badge>{validation.filter((item) => item.ok).length}/{validation.length}</Badge></CardHeader><CardContent className="space-y-3 pt-5">
              {validation.map((item) => <div key={item.label} className={`flex items-center gap-3 rounded-lg border p-3 ${item.ok ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.ok ? 'bg-emerald-500 text-white' : 'bg-amber-500/15 text-amber-600'}`}>{item.ok ? <Check className="h-4 w-4" /> : '!'}</span><p className="flex-1 text-sm font-medium">{item.label}</p><span className="text-xs text-muted-foreground">{item.ok ? '확인됨' : '확인 필요'}</span></div>)}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" />안전한 템플릿 등록</p><p className="mt-2 text-xs leading-5 text-muted-foreground">같은 상품군에서 직접 등록한 기존 상품의 배송·교환·상품정보제공고시 구조를 가져옵니다. 인증·원산지·배송 조건이 새 상품과 동일한지 반드시 확인하세요.</p></div>
              <div className="grid gap-3 md:grid-cols-3"><div className="space-y-2"><Label>템플릿 채널 상품번호</Label><Input value={templateProductNo} onChange={(event) => setTemplateProductNo(event.target.value.replace(/\D/g, ''))} placeholder="12345678901" /></div><div className="space-y-2"><Label>리프 카테고리 ID</Label><Input value={categoryId} onChange={(event) => setCategoryId(event.target.value)} /></div><div className="space-y-2"><Label>초기 재고</Label><Input type="number" min="1" value={stock} onChange={(event) => setStock(event.target.value)} /></div></div>
            </CardContent></Card>
            <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-emerald-600" />스마트스토어 연결</CardTitle></CardHeader><CardContent className="space-y-4 pt-5">
              <div className={`rounded-xl border p-4 ${commerceConfigured ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}><p className="font-semibold">{commerceConfigured ? 'API 설정 확인됨' : 'API 연결 확인 필요'}</p><p className="mt-1 text-xs text-muted-foreground">인증 정보는 설정 페이지에만 저장되며 브라우저로 전달하지 않습니다.</p></div>
              <Button variant="outline" className="w-full" onClick={() => void testCommerceConnection()}>API 연결 테스트</Button>
              {connectionMessage && <p className="rounded-lg bg-muted p-3 text-xs leading-5">{connectionMessage}</p>}
              <div className="space-y-2 text-xs text-muted-foreground"><p>게시 상품: <b className="text-foreground">{productName || '-'}</b></p><p>판매가: <b className="text-foreground">{formatWon(Number(salePrice))}</b></p><p>선택 후보: <b className="text-foreground">{selectedProducts.length}개</b></p></div>
            </CardContent></Card>
          </div>
          <Card className="border-slate-900 bg-slate-950 text-white"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><label className="flex items-start gap-3 text-sm"><Checkbox checked={publishConfirmed} onCheckedChange={(checked) => setPublishConfirmed(checked === true)} className="border-white/50" /><span><b className="block">실제 게시 전 최종 승인</b><span className="mt-1 block text-xs text-slate-400">상품 정보, 이미지 권리, 인증 근거와 템플릿 조건을 직접 확인했습니다.</span></span></label><div className="flex flex-wrap gap-2"><Button variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white" onClick={downloadPackage}><Download className="mr-2 h-4 w-4" />등록 패키지 저장</Button><Button onClick={() => void publishProduct()} disabled={!readyToPublish || isPublishing}>{isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}{isPublishing ? '게시 중...' : '스마트스토어에 게시'}</Button></div></CardContent></Card>
          {publishMessage && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{publishMessage}</p>}
        </div>
      )}
    </div>
  )
}
