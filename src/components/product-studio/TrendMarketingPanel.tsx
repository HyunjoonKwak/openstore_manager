'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  Megaphone,
  MousePointerClick,
  Search,
  ShoppingCart,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface TrendPoint {
  period: string
  ratio: number
  group?: string
}

interface TrendResult {
  title: string
  data: TrendPoint[]
}

interface TrendResponse {
  search?: { results?: TrendResult[] }
  shopping?: { results?: TrendResult[] } | null
  device?: { results?: TrendResult[] } | null
}

interface InflowSource {
  source: string
  detail: string
  orders: number
  quantity: number
  revenue: number
}

interface InflowProduct {
  name: string
  orders: number
  quantity: number
  revenue: number
}

interface InflowResponse {
  totalOrders: number
  sources: InflowSource[]
  products: InflowProduct[]
}

interface KeywordMetric {
  keyword: string
  current: number
  previous: number
  growth: number
  shoppingCurrent: number | null
  data: TrendPoint[]
}

interface TrendMarketingPanelProps {
  keyword: string
  categoryId: string
  onUseKeyword: (keyword: string) => void
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

function buildMetrics(response: TrendResponse | null): KeywordMetric[] {
  const shopping = new Map((response?.shopping?.results || []).map((item) => [item.title, item.data || []]))
  return (response?.search?.results || []).map((result) => {
    const data = result.data || []
    const split = Math.min(7, Math.max(1, Math.floor(data.length / 2)))
    const recent = data.slice(-split).map((point) => Number(point.ratio || 0))
    const prior = data.slice(-split * 2, -split).map((point) => Number(point.ratio || 0))
    const current = average(recent)
    const previous = average(prior)
    const shoppingData = shopping.get(result.title) || []
    const shoppingCurrent = shoppingData.length
      ? average(shoppingData.slice(-split).map((point) => Number(point.ratio || 0)))
      : null
    return {
      keyword: result.title,
      current,
      previous,
      growth: previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0,
      shoppingCurrent,
      data,
    }
  }).sort((a, b) => b.current - a.current)
}

function TrendChart({ metric }: { metric: KeywordMetric | undefined }) {
  if (!metric?.data.length) {
    return <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">분석 후 검색 흐름이 표시됩니다.</div>
  }
  const values = metric.data.map((point) => Number(point.ratio || 0))
  const max = Math.max(...values, 1)
  const width = 720
  const height = 180
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
    const y = height - (value / max) * (height - 20) - 10
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label={`${metric.keyword} 검색 흐름`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#trend-fill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{metric.data[0]?.period}</span><span>상대 검색지수 · 최대 100</span><span>{metric.data.at(-1)?.period}</span>
      </div>
    </div>
  )
}

export function TrendMarketingPanel({ keyword, categoryId, onUseKeyword }: TrendMarketingPanelProps) {
  const [open, setOpen] = useState(true)
  const [candidateInput, setCandidateInput] = useState('')
  const [days, setDays] = useState('30')
  const [trend, setTrend] = useState<TrendResponse | null>(null)
  const [inflow, setInflow] = useState<InflowResponse | null>(null)
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trendMessage, setTrendMessage] = useState('후보 검색어를 비교해 상승세와 쇼핑 클릭 흐름을 확인하세요.')
  const [inflowMessage, setInflowMessage] = useState('최근 주문의 실제 구매 전환 유입경로를 집계합니다.')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTrend, setManualTrend] = useState('')
  const [manualInflow, setManualInflow] = useState('')

  const metrics = useMemo(() => buildMetrics(trend), [trend])
  const activeMetric = metrics.find((item) => item.keyword === selectedKeyword) || metrics[0]
  const mobileShare = useMemo(() => {
    const points = trend?.device?.results?.flatMap((result) => result.data || []) || []
    const mobile = points.filter((point) => point.group === 'mo').reduce((sum, point) => sum + Number(point.ratio || 0), 0)
    const total = points.reduce((sum, point) => sum + Number(point.ratio || 0), 0)
    return total ? Math.round(mobile / total * 100) : null
  }, [trend])

  const marketingActions = useMemo(() => {
    const actions: Array<{ title: string; body: string; icon: 'trend' | 'mobile' | 'inflow' }> = []
    const rising = [...metrics].sort((a, b) => b.growth - a.growth)[0]
    if (rising) {
      actions.push({
        title: rising.growth >= 10 ? `${rising.keyword} 상승 구간 선점` : `${rising.keyword} 수요 유지 전략`,
        body: rising.growth >= 10
          ? `최근 구간이 ${rising.growth.toFixed(0)}% 상승했습니다. 제목 앞부분·검색광고·콘텐츠 소재를 같은 검색 의도로 맞춰 72시간 소액 테스트하세요.`
          : '급격한 상승 신호가 약합니다. 광고비 확대보다 상세페이지 전환율과 리뷰·FAQ 보강을 우선하세요.',
        icon: 'trend',
      })
    }
    if (mobileShare !== null) {
      actions.push({
        title: `모바일 클릭 비중 ${mobileShare}% 대응`,
        body: mobileShare >= 65
          ? '첫 화면에 핵심 효익·가격·신뢰 근거를 집중하고, 세로형 이미지와 짧은 문장으로 제작하세요.'
          : 'PC와 모바일 유입이 함께 보입니다. 모바일 첫 화면과 PC 비교표를 각각 검수하세요.',
        icon: 'mobile',
      })
    }
    const source = inflow?.sources?.[0]
    if (source) {
      actions.push({
        title: `${source.source} 구매전환 강화`,
        body: `${source.orders}건으로 가장 많은 구매를 만들었습니다. 같은 유입의 랜딩 메시지를 유지하고 2위 채널과 예산·소재를 비교하세요.`,
        icon: 'inflow',
      })
    }
    return actions.slice(0, 3)
  }, [inflow, metrics, mobileShare])

  function candidates() {
    const entered = candidateInput.split(/[,\n]/).map((value) => value.trim()).filter(Boolean)
    const base = keyword.trim()
    const defaults = base ? [base, `${base} 추천`, `${base} 가성비`, `${base} 인기`, `${base} 신제품`] : []
    return Array.from(new Set(entered.length ? entered : defaults)).slice(0, 5)
  }

  async function runTrendResearch() {
    const terms = candidates()
    if (terms.length < 2) return toast.error('비교할 후보 검색어를 2개 이상 입력해주세요.')
    setCandidateInput(terms.join(', '))
    setIsLoading(true)
    const [trendResult, inflowResult] = await Promise.allSettled([
      fetch('/api/trends/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: terms, categoryId, days: Number(days) }),
      }).then(async (response) => ({ ok: response.ok, data: await response.json() })),
      fetch('/api/trends/inflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: Math.min(30, Number(days)) }),
      }).then(async (response) => ({ ok: response.ok, data: await response.json() })),
    ])

    if (trendResult.status === 'fulfilled' && trendResult.value.ok) {
      setTrend(trendResult.value.data)
      const first = buildMetrics(trendResult.value.data)[0]?.keyword || terms[0]
      setSelectedKeyword(first)
      setTrendMessage(`${terms.length}개 후보의 검색 추이를 분석했습니다.`)
    } else {
      const message = trendResult.status === 'fulfilled' ? trendResult.value.data.message : '트렌드 요청에 실패했습니다.'
      setTrendMessage(`${message} 아래 직접 가져오기로 계속할 수 있습니다.`)
    }

    if (inflowResult.status === 'fulfilled' && inflowResult.value.ok) {
      setInflow(inflowResult.value.data)
      setInflowMessage(`최근 ${inflowResult.value.data.totalOrders}건의 주문 유입을 집계했습니다.`)
    } else {
      const message = inflowResult.status === 'fulfilled' ? inflowResult.value.data.message : '판매 유입 요청에 실패했습니다.'
      setInflowMessage(`${message} 판매자센터 자료를 직접 가져올 수 있습니다.`)
    }
    setIsLoading(false)
  }

  function importManualTrend() {
    const rows = manualTrend.split('\n').map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
      .filter((cells) => cells[0] && Number.isFinite(Number(cells[1])) && Number.isFinite(Number(cells[2])))
    if (rows.length < 2) return toast.error('검색어, 최근지수, 이전지수 형식으로 2개 이상 입력해주세요.')
    const response: TrendResponse = {
      search: {
        results: rows.slice(0, 10).map((cells) => ({
          title: cells[0],
          data: [{ period: '이전', ratio: Number(cells[2]) }, { period: '최근', ratio: Number(cells[1]) }],
        })),
      },
    }
    setTrend(response)
    setSelectedKeyword(buildMetrics(response)[0]?.keyword || '')
    setTrendMessage('직접 입력한 검색어 지수를 비교했습니다.')
  }

  function importManualInflow() {
    const sources = manualInflow.split('\n').map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
      .filter((cells) => cells[0] && Number(cells[1]) > 0)
      .map((cells) => ({ source: cells[0], detail: '', orders: Number(cells[1]), quantity: Number(cells[1]), revenue: Number(String(cells[2] || '0').replace(/[^0-9]/g, '')) }))
      .sort((a, b) => b.orders - a.orders)
    if (!sources.length) return toast.error('유입경로, 주문수, 매출 형식으로 입력해주세요.')
    setInflow({ totalOrders: sources.reduce((sum, item) => sum + item.orders, 0), sources, products: [] })
    setInflowMessage('직접 입력한 판매 유입 자료를 집계했습니다.')
  }

  const maxOrders = Math.max(...(inflow?.sources || []).map((item) => item.orders), 1)

  return (
    <Card className="overflow-hidden border-blue-500/20">
      <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-blue-500/10 via-background to-emerald-500/10">
        <div>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" />트렌드 · 마케팅 인사이트</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">검색 흐름과 실제 구매 유입을 함께 보고 이번 상품의 마케팅 우선순위를 정합니다.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{open ? '접기' : '열기'}
        </Button>
      </CardHeader>
      {open && <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-end">
          <div className="space-y-2"><Label>비교할 후보 검색어 · 최대 5개</Label><Input value={candidateInput} onChange={(event) => setCandidateInput(event.target.value)} placeholder={keyword ? `${keyword}, ${keyword} 추천, ${keyword} 가성비` : '예: 휴대용 선풍기, 냉각 선풍기, 손풍기'} /><p className="text-xs text-muted-foreground">비워두면 아래 조사 검색어를 기준으로 후보를 자동 구성합니다.</p></div>
          <div className="space-y-2"><Label>분석 기간</Label><Select value={days} onValueChange={setDays}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">최근 30일</SelectItem><SelectItem value="90">최근 90일</SelectItem><SelectItem value="180">최근 180일</SelectItem></SelectContent></Select></div>
          <Button className="h-10" onClick={() => void runTrendResearch()} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}{isLoading ? '분석 중...' : '트렌드 분석'}</Button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-4">
            <div className="rounded-xl border">
              <div className="flex items-center justify-between border-b p-4"><div><h3 className="font-semibold">최근 후보 검색어 순위</h3><p className="mt-1 text-xs text-muted-foreground">{trendMessage}</p></div><Badge variant="secondary">상대지수</Badge></div>
              <div className="divide-y">
                {metrics.length ? metrics.map((metric, index) => <div role="button" tabIndex={0} key={metric.keyword} onClick={() => setSelectedKeyword(metric.keyword)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedKeyword(metric.keyword) }} className={`grid w-full grid-cols-[24px_minmax(0,1fr)_58px_60px] items-center gap-2 p-3 text-left text-sm hover:bg-muted/40 sm:grid-cols-[32px_minmax(0,1fr)_90px_90px_70px] ${activeMetric?.keyword === metric.keyword ? 'bg-blue-500/5' : ''}`}><b className="text-blue-600">{index + 1}</b><span className="truncate font-medium">{metric.keyword}</span><span>{metric.current.toFixed(1)}</span><span className={metric.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{metric.growth >= 0 ? '+' : ''}{metric.growth.toFixed(0)}%</span><Button size="sm" variant="ghost" className="col-span-4 w-full sm:col-span-1 sm:w-auto" onClick={(event) => { event.stopPropagation(); onUseKeyword(metric.keyword); toast.success('상품 조사 검색어에 반영했습니다.') }}>사용</Button></div>) : <div className="p-8 text-center text-sm text-muted-foreground">후보 검색어를 입력하고 분석을 시작하세요.</div>}
              </div>
            </div>
            <div><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">검색어 흐름 · {activeMetric?.keyword || '-'}</h3>{activeMetric && <Badge variant={activeMetric.growth >= 10 ? 'default' : 'secondary'}>{activeMetric.growth >= 10 ? <TrendingUp className="mr-1 h-3 w-3" /> : activeMetric.growth < -10 ? <TrendingDown className="mr-1 h-3 w-3" /> : null}{activeMetric.growth >= 10 ? '상승' : activeMetric.growth < -10 ? '하락' : '안정'}</Badge>}</div><TrendChart metric={activeMetric} /></div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">판매 유입 상위</h3><ShoppingCart className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-xs text-muted-foreground">{inflowMessage}</p><div className="mt-4 space-y-3">{inflow?.sources?.length ? inflow.sources.slice(0, 6).map((source, index) => <div key={`${source.source}-${source.detail}`}><div className="mb-1 flex items-center justify-between text-xs"><span><b className="mr-2 text-emerald-600">{index + 1}</b>{source.source}{source.detail ? ` · ${source.detail}` : ''}</span><span>{source.orders}건 · {formatWon(source.revenue)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${source.orders / maxOrders * 100}%` }} /></div></div>) : <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">커머스 API 연결 후 실제 구매 유입이 표시됩니다.</p>}</div></div>
            {mobileShare !== null && <div className="rounded-xl border p-4"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">모바일 쇼핑 클릭 {mobileShare}%</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">첫 화면의 메시지·가격·신뢰 근거를 모바일 한 화면 안에서 확인할 수 있게 구성하세요.</p></div>}
            {inflow?.products?.length ? <div className="rounded-xl border p-4"><h3 className="font-semibold">구매 전환 상품 TOP 5</h3><div className="mt-3 space-y-2">{inflow.products.slice(0, 5).map((product, index) => <div key={product.name} className="flex items-center justify-between gap-3 text-xs"><span className="truncate"><b className="mr-2 text-blue-600">{index + 1}</b>{product.name}</span><span className="shrink-0">{product.quantity}개</span></div>)}</div></div> : null}
          </div>
        </div>

        {marketingActions.length > 0 && <div><h3 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-amber-500" />이번 상품 마케팅 실행안</h3><div className="grid gap-3 lg:grid-cols-3">{marketingActions.map((action) => <div key={action.title} className="rounded-xl border bg-muted/20 p-4">{action.icon === 'trend' ? <ArrowUpRight className="mb-3 h-5 w-5 text-emerald-600" /> : action.icon === 'mobile' ? <Smartphone className="mb-3 h-5 w-5 text-blue-600" /> : <Megaphone className="mb-3 h-5 w-5 text-violet-600" />}<p className="font-semibold">{action.title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{action.body}</p></div>)}</div></div>}

        <div className="rounded-xl border border-dashed"><button type="button" onClick={() => setManualOpen((value) => !value)} className="flex w-full items-center justify-between p-4 text-left"><span><b className="flex items-center gap-2"><Upload className="h-4 w-4" />판매자센터 자료 직접 가져오기</b><span className="mt-1 block text-xs text-muted-foreground">API 연결 전에도 검색어 지수와 유입 자료를 붙여 넣어 사용할 수 있습니다.</span></span>{manualOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{manualOpen && <div className="grid gap-4 border-t p-4 lg:grid-cols-2"><div className="space-y-2"><Label>검색어, 최근지수, 이전지수</Label><Textarea rows={5} value={manualTrend} onChange={(event) => setManualTrend(event.target.value)} placeholder={'냉각 선풍기,92,61\n휴대용 선풍기,78,80'} /><Button variant="outline" size="sm" onClick={importManualTrend}><Check className="mr-2 h-4 w-4" />검색 순위 반영</Button></div><div className="space-y-2"><Label>유입경로, 주문수, 매출</Label><Textarea rows={5} value={manualInflow} onChange={(event) => setManualInflow(event.target.value)} placeholder={'네이버 쇼핑,24,720000\n검색광고(SA),12,410000'} /><Button variant="outline" size="sm" onClick={importManualInflow}><MousePointerClick className="mr-2 h-4 w-4" />판매 유입 반영</Button></div></div>}</div>

        <p className="text-[11px] leading-5 text-muted-foreground">검색·클릭 지수는 실제 검색 횟수가 아니라 조회 기간 내 최댓값을 100으로 둔 상대값입니다. 판매 유입은 방문 전체가 아니라 주문으로 전환된 유입경로입니다.</p>
      </CardContent>}
    </Card>
  )
}
