'use client'
/* eslint-disable @next/next/no-img-element -- 벤치마킹 대상의 임의 원격 이미지를 비교합니다. */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  StickyNote,
  CheckSquare,
  Image as ImageIcon,
  Columns,
  X,
  Download,
  Pencil,
  Link as LinkIcon,
  Search,
  Sparkles,
  Loader2,
  ShoppingBag,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  addBenchmarkPage,
  deleteBenchmarkPage,
  updateBenchmarkPage,
  updateBenchmarkSession,
  addBenchmarkChecklist,
  updateBenchmarkChecklist,
  deleteBenchmarkChecklist,
  addBenchmarkMemo,
  deleteBenchmarkMemo,
  addBenchmarkAsset,
  deleteBenchmarkAsset,
} from '@/lib/actions/benchmark'
import type { BenchmarkSessionWithDetails, ProductForBenchmark } from '@/lib/actions/benchmark'
import type { BenchmarkPage, BenchmarkChecklist, BenchmarkMemo, BenchmarkAsset } from '@/types/database.types'
import { StudioWorkflow } from '@/components/product-studio/StudioWorkflow'

interface MarketProduct {
  product_id: string
  title: string
  price: number
  mall_name: string
  url: string
  image_url?: string
  brand?: string
  review_count?: number
  purchase_count?: number
}

interface ComparisonViewerClientProps {
  session: BenchmarkSessionWithDetails
  products: ProductForBenchmark[]
}

export function ComparisonViewerClient({ session: initialSession, products }: ComparisonViewerClientProps) {
  const [isPending, startTransition] = useTransition()
  const [session, setSession] = useState(initialSession)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    session.pages[0]?.id || null
  )
  const [activePanel, setActivePanel] = useState<'research' | 'checklist' | 'pages' | 'memos' | 'assets'>('research')

  const [addPageDialogOpen, setAddPageDialogOpen] = useState(false)
  const [newPageUrl, setNewPageUrl] = useState('')
  const [newPageTitle, setNewPageTitle] = useState('')

  const [selectProductOpen, setSelectProductOpen] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')

  const [newChecklistContent, setNewChecklistContent] = useState('')

  const [newMemoContent, setNewMemoContent] = useState('')
  const [newMemoColor, setNewMemoColor] = useState('yellow')

  const [newAssetUrl, setNewAssetUrl] = useState('')
  const [newAssetMemo, setNewAssetMemo] = useState('')

  const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false)
  const [deletePageTarget, setDeletePageTarget] = useState<BenchmarkPage | null>(null)

  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingPageTitle, setEditingPageTitle] = useState('')

  const [myPageZoom, setMyPageZoom] = useState(100)
  const [comparePageZoom, setComparePageZoom] = useState(100)

  const [marketQuery, setMarketQuery] = useState(session.title.replace(/판매페이지|개선|프로젝트/g, '').trim())
  const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([])
  const [isMarketLoading, setIsMarketLoading] = useState(false)
  const [marketMessage, setMarketMessage] = useState('상품명을 검색해 노출 상위 상품을 비교 자료로 추가하세요.')

  const selectedPage = session.pages.find((p) => p.id === selectedPageId)

  const zoomOptions = [50, 75, 100]

  const handleMarketSearch = async () => {
    if (marketQuery.trim().length < 2) {
      toast.error('검색어를 두 글자 이상 입력해주세요.')
      return
    }

    setIsMarketLoading(true)
    setMarketMessage('네이버 쇼핑 공개 노출 결과를 불러오는 중입니다.')
    try {
      const response = await fetch(`/api/market-research?q=${encodeURIComponent(marketQuery.trim())}&limit=20`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || '시장 검색에 실패했습니다.')

      const items = Array.isArray(data.items) ? data.items : []
      setMarketProducts(items)
      setMarketMessage(
        items.length > 0
          ? `${items.length}개 상품을 찾았습니다. 노출 순위는 실제 판매량 순위가 아닙니다.`
          : '검색 결과가 없습니다. 더 넓은 상품명으로 다시 검색해보세요.'
      )
    } catch (error) {
      setMarketProducts([])
      setMarketMessage(error instanceof Error ? error.message : '시장 검색에 실패했습니다.')
    } finally {
      setIsMarketLoading(false)
    }
  }

  const handleAddMarketProduct = (product: MarketProduct) => {
    if (!product.url || product.url === '#') {
      toast.error('상세페이지 주소가 없는 상품입니다.')
      return
    }
    if (session.pages.some((page) => page.url === product.url)) {
      toast.info('이미 비교 페이지에 추가된 상품입니다.')
      return
    }

    startTransition(async () => {
      const result = await addBenchmarkPage(session.id, {
        url: product.url.split('?')[0],
        title: product.title.replace(/<[^>]+>/g, ''),
        platform: detectPlatform(product.url),
      })

      if (result.data) {
        setSession((current) => ({ ...current, pages: [...current.pages, result.data!] }))
        setSelectedPageId(result.data.id)
        toast.success('비교 페이지에 추가했습니다.')
      } else {
        toast.error(result.error || '페이지 추가에 실패했습니다.')
      }
    })
  }

  const handleAddPage = () => {
    if (!newPageUrl.trim()) {
      toast.error('URL을 입력해주세요.')
      return
    }

    const cleanUrl = newPageUrl.split('?')[0]

    startTransition(async () => {
      const result = await addBenchmarkPage(session.id, {
        url: cleanUrl,
        title: newPageTitle || undefined,
        platform: detectPlatform(cleanUrl),
      })

      if (result.data) {
        setSession({
          ...session,
          pages: [...session.pages, result.data],
        })
        setAddPageDialogOpen(false)
        setNewPageUrl('')
        setNewPageTitle('')
        setSelectedPageId(result.data.id)
        toast.success('페이지가 추가되었습니다.')
      } else {
        toast.error(result.error || '추가에 실패했습니다.')
      }
    })
  }

  const handleDeletePage = () => {
    if (!deletePageTarget) return

    startTransition(async () => {
      const result = await deleteBenchmarkPage(deletePageTarget.id, session.id)

      if (result.success) {
        const newPages = session.pages.filter((p) => p.id !== deletePageTarget.id)
        setSession({ ...session, pages: newPages })
        if (selectedPageId === deletePageTarget.id) {
          setSelectedPageId(newPages[0]?.id || null)
        }
        toast.success('페이지가 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
      setDeletePageTarget(null)
    })
  }

  const handleStartEditPage = (page: BenchmarkPage) => {
    setEditingPageId(page.id)
    setEditingPageTitle(page.title || '')
  }

  const handleSavePageTitle = (pageId: string) => {
    startTransition(async () => {
      const result = await updateBenchmarkPage(pageId, { title: editingPageTitle })

      if (result.success) {
        setSession({
          ...session,
          pages: session.pages.map((p) =>
            p.id === pageId ? { ...p, title: editingPageTitle } : p
          ),
        })
        setEditingPageId(null)
        setEditingPageTitle('')
      } else {
        toast.error(result.error || '수정에 실패했습니다.')
      }
    })
  }

  const handleCancelEditPage = () => {
    setEditingPageId(null)
    setEditingPageTitle('')
  }

  const handleSelectProduct = (product: ProductForBenchmark) => {
    const productNo = product.channelProductNo || product.platformProductId
    if (!productNo) {
      toast.error('네이버 연동 상품만 선택할 수 있습니다.')
      return
    }

    const naverUrl = product.storeUrlName
      ? `https://smartstore.naver.com/${product.storeUrlName}/products/${productNo}`
      : `https://search.shopping.naver.com/catalog/${productNo}`



    startTransition(async () => {
      const result = await updateBenchmarkSession(session.id, {
        myPageUrl: naverUrl,
        myProductId: product.id,
      })

      if (result.success) {
        setSession({
          ...session,
          my_page_url: naverUrl,
          my_product_id: product.id,
        })
        setSelectProductOpen(false)
        setProductSearchQuery('')
        toast.success('내 상품이 선택되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.storeName.toLowerCase().includes(productSearchQuery.toLowerCase())
  )

  const selectedProduct = products.find((p) => p.id === session.my_product_id)

  const handleAddChecklist = () => {
    if (!newChecklistContent.trim()) return

    startTransition(async () => {
      const result = await addBenchmarkChecklist(session.id, {
        content: newChecklistContent,
      })

      if (result.data) {
        setSession({
          ...session,
          checklists: [...session.checklists, result.data],
        })
        setNewChecklistContent('')
      } else {
        toast.error(result.error || '추가에 실패했습니다.')
      }
    })
  }

  const handleToggleChecklist = (item: BenchmarkChecklist) => {
    startTransition(async () => {
      const result = await updateBenchmarkChecklist(item.id, {
        isCompleted: !item.is_completed,
      })

      if (result.success) {
        setSession({
          ...session,
          checklists: session.checklists.map((c) =>
            c.id === item.id ? { ...c, is_completed: !c.is_completed } : c
          ),
        })
      }
    })
  }

  const handleDeleteChecklist = (item: BenchmarkChecklist) => {
    startTransition(async () => {
      const result = await deleteBenchmarkChecklist(item.id, session.id)

      if (result.success) {
        setSession({
          ...session,
          checklists: session.checklists.filter((c) => c.id !== item.id),
        })
      }
    })
  }

  const handleAddMemo = () => {
    if (!newMemoContent.trim()) return

    startTransition(async () => {
      const result = await addBenchmarkMemo(session.id, {
        content: newMemoContent,
        color: newMemoColor,
      })

      if (result.data) {
        setSession({
          ...session,
          memos: [...session.memos, result.data],
        })
        setNewMemoContent('')
      } else {
        toast.error(result.error || '메모 추가에 실패했습니다.')
      }
    })
  }

  const handleDeleteMemo = (item: BenchmarkMemo) => {
    startTransition(async () => {
      const result = await deleteBenchmarkMemo(item.id, session.id)

      if (result.success) {
        setSession({
          ...session,
          memos: session.memos.filter((m) => m.id !== item.id),
        })
      }
    })
  }

  const handleAddAsset = () => {
    if (!newAssetUrl.trim()) {
      toast.error('이미지 URL을 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await addBenchmarkAsset(session.id, {
        assetType: 'image',
        url: newAssetUrl,
        memo: newAssetMemo || undefined,
      })

      if (result.data) {
        setSession({
          ...session,
          assets: [result.data, ...session.assets],
        })
        setNewAssetUrl('')
        setNewAssetMemo('')
        toast.success('이미지가 추가되었습니다.')
      } else {
        toast.error(result.error || '이미지 추가에 실패했습니다.')
      }
    })
  }

  const handleDeleteAsset = (item: BenchmarkAsset) => {
    startTransition(async () => {
      const result = await deleteBenchmarkAsset(item.id, session.id)

      if (result.success) {
        setSession({
          ...session,
          assets: session.assets.filter((a) => a.id !== item.id),
        })
      }
    })
  }

  const handleDownloadAllAssets = async () => {
    const imageAssets = session.assets.filter((a) => a.asset_type === 'image' && a.url)
    if (imageAssets.length === 0) {
      toast.error('다운로드할 이미지가 없습니다.')
      return
    }

    for (const asset of imageAssets) {
      if (asset.url) {
        window.open(asset.url, '_blank')
      }
    }
    toast.success(`${imageAssets.length}개 이미지 탭이 열렸습니다.`)
  }

  const memoColors = [
    { value: 'yellow', label: '노랑', className: 'bg-yellow-200' },
    { value: 'blue', label: '파랑', className: 'bg-blue-200' },
    { value: 'green', label: '초록', className: 'bg-green-200' },
    { value: 'pink', label: '분홍', className: 'bg-pink-200' },
    { value: 'purple', label: '보라', className: 'bg-purple-200' },
  ]

  const getMemoColorClass = (color: string) => {
    return memoColors.find((c) => c.value === color)?.className || 'bg-yellow-200'
  }

  const detectPlatform = (url: string): string => {
    if (url.includes('smartstore.naver.com')) return 'naver_smartstore'
    if (url.includes('brand.naver.com')) return 'naver_brand'
    if (url.includes('coupang.com')) return 'coupang'
    if (url.includes('gmarket.co.kr')) return 'gmarket'
    if (url.includes('11st.co.kr')) return '11st'
    return 'unknown'
  }

  const getPlatformLabel = (platform: string): string => {
    const labels: Record<string, string> = {
      naver_smartstore: '스마트스토어',
      naver_brand: '브랜드스토어',
      coupang: '쿠팡',
      gmarket: 'G마켓',
      '11st': '11번가',
    }
    return labels[platform] || '기타'
  }

  const completedCount = session.checklists.filter((c) => c.is_completed).length
  const totalCount = session.checklists.length

  return (
    <>
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/benchmarking" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">프로젝트</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{session.title}</h2>
          <Button size="sm" className="gap-2" asChild>
            <Link href={`/benchmarking?view=ai&sessionId=${session.id}${session.my_product_id ? `&productId=${session.my_product_id}` : ''}`}>
              <Sparkles className="h-4 w-4" />
              AI 판매페이지 만들기
            </Link>
          </Button>
        </div>
        <StudioWorkflow activeStep={session.checklists.length > 0 || session.memos.length > 0 ? 2 : 1} compact className="mt-3" />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 flex flex-col border-r border-border min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium shrink-0">내 상품</span>
                {selectedProduct && (
                  <>
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedProduct.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => window.open(session.my_page_url!, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center border rounded-md">
                  {zoomOptions.map((zoom) => (
                    <Button
                      key={zoom}
                      variant={myPageZoom === zoom ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs rounded-none first:rounded-l-md last:rounded-r-md"
                      onClick={() => setMyPageZoom(zoom)}
                    >
                      {zoom}%
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectProductOpen(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {selectedProduct ? '변경' : '상품 선택'}
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-muted/20 relative overflow-hidden">
              {session.my_page_url ? (
                <div
                  className="origin-top-left"
                  style={{
                    width: `${100 / (myPageZoom / 100)}%`,
                    height: `${100 / (myPageZoom / 100)}%`,
                    transform: `scale(${myPageZoom / 100})`,
                  }}
                >
                  <iframe
                    src={session.my_page_url}
                    className="w-full h-full border-0"
                    title="내 페이지"
                    sandbox="allow-scripts allow-popups"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <LinkIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    재고관리에서 연동된 내 상품을 선택해주세요
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSelectProductOpen(true)}>
                    상품 선택하기
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium shrink-0">비교 페이지</span>
                {selectedPage && (
                  <>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getPlatformLabel(selectedPage.platform)}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedPage.title || new URL(selectedPage.url).hostname}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => window.open(selectedPage.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center border rounded-md">
                  {zoomOptions.map((zoom) => (
                    <Button
                      key={zoom}
                      variant={comparePageZoom === zoom ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs rounded-none first:rounded-l-md last:rounded-r-md"
                      onClick={() => setComparePageZoom(zoom)}
                    >
                      {zoom}%
                    </Button>
                  ))}
                </div>
                {session.pages.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Columns className="h-3 w-3 mr-1" />
                        페이지 선택
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {session.pages.map((page) => (
                        <DropdownMenuItem
                          key={page.id}
                          onClick={() => setSelectedPageId(page.id)}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate flex-1">
                            {page.title || new URL(page.url).hostname}
                          </span>
                          {page.id === selectedPageId && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              선택됨
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAddPageDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-muted/20 overflow-hidden">
              {selectedPage ? (
                <div
                  className="origin-top-left"
                  style={{
                    width: `${100 / (comparePageZoom / 100)}%`,
                    height: `${100 / (comparePageZoom / 100)}%`,
                    transform: `scale(${comparePageZoom / 100})`,
                  }}
                >
                  <iframe
                    src={selectedPage.url}
                    className="w-full h-full border-0"
                    title="비교 페이지"
                    sandbox="allow-scripts allow-popups"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Plus className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    비교할 경쟁사 페이지를 추가해주세요
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setAddPageDialogOpen(true)}>
                    페이지 추가하기
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col bg-background shrink-0">
          <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as typeof activePanel)} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b h-10 grid grid-cols-5">
              <TabsTrigger value="research" className="gap-1 text-xs px-1">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">시장</span>
              </TabsTrigger>
              <TabsTrigger value="checklist" className="gap-1 text-xs px-1">
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">체크</span>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {completedCount}/{totalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="memos" className="gap-1 text-xs px-1">
                <StickyNote className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">메모</span>
                {session.memos.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {session.memos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1 text-xs px-1">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">자료</span>
                {session.assets.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {session.assets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pages" className="gap-1 text-xs px-1">
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">페이지</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {session.pages.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="research" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="space-y-2 border-b p-3">
                <div className="flex gap-2">
                  <Input
                    value={marketQuery}
                    onChange={(event) => setMarketQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleMarketSearch()
                    }}
                    placeholder="예: 휴대용 선풍기"
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => void handleMarketSearch()}
                    disabled={isMarketLoading}
                  >
                    {isMarketLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{marketMessage}</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-2">
                  {marketProducts.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <ShoppingBag className="mx-auto mb-2 h-9 w-9 opacity-30" />
                      <p className="text-sm">검색 결과가 여기에 표시됩니다</p>
                      <p className="mt-1 text-xs">상위 상품을 골라 비교 페이지로 추가하세요</p>
                    </div>
                  ) : (
                    marketProducts.map((product, index) => {
                      const cleanTitle = product.title.replace(/<[^>]+>/g, '')
                      const isAdded = session.pages.some((page) => page.url === product.url || page.url === product.url?.split('?')[0])
                      return (
                        <div key={`${product.product_id}-${index}`} className="rounded-lg border bg-card p-2.5">
                          <div className="flex gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                            {product.image_url && (
                              <img src={product.image_url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-medium leading-relaxed">{cleanTitle}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {product.mall_name} · {Number(product.price || 0).toLocaleString('ko-KR')}원
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1">
                            {product.url && product.url !== '#' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(product.url, '_blank')}>
                                <ExternalLink className="mr-1 h-3 w-3" /> 보기
                              </Button>
                            )}
                            <Button
                              variant={isAdded ? 'secondary' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isAdded || isPending}
                              onClick={() => handleAddMarketProduct(product)}
                            >
                              {isAdded ? '추가됨' : '비교에 추가'}
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="checklist" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b">
                <div className="flex gap-2">
                  <Input
                    placeholder="개선할 점을 입력하세요..."
                    value={newChecklistContent}
                    onChange={(e) => setNewChecklistContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddChecklist()
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 shrink-0"
                    onClick={handleAddChecklist}
                    disabled={isPending || !newChecklistContent.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {session.checklists.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>아직 체크리스트가 없습니다</p>
                      <p className="text-xs mt-1">개선점을 추가해보세요</p>
                    </div>
                  ) : (
                    session.checklists.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 group"
                      >
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={() => handleToggleChecklist(item)}
                          className="mt-0.5"
                        />
                        <span
                          className={`flex-1 text-sm ${
                            item.is_completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item.content}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteChecklist(item)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="memos" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b space-y-2">
                <Textarea
                  placeholder="메모를 입력하세요..."
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {memoColors.map((color) => (
                      <button
                        key={color.value}
                        className={`w-5 h-5 rounded-full border-2 ${color.className} ${
                          newMemoColor === color.value ? 'border-foreground' : 'border-transparent'
                        }`}
                        onClick={() => setNewMemoColor(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={handleAddMemo}
                    disabled={isPending || !newMemoContent.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    추가
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {session.memos.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>아직 메모가 없습니다</p>
                      <p className="text-xs mt-1">비교하면서 메모를 남겨보세요</p>
                    </div>
                  ) : (
                    session.memos.map((memo) => (
                      <div
                        key={memo.id}
                        className={`p-3 rounded-md group ${getMemoColorClass(memo.color)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1 whitespace-pre-wrap">{memo.content}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={() => handleDeleteMemo(memo)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {new Date(memo.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b space-y-2">
                <Input
                  placeholder="이미지 URL 입력..."
                  value={newAssetUrl}
                  onChange={(e) => setNewAssetUrl(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="메모 (선택)"
                  value={newAssetMemo}
                  onChange={(e) => setNewAssetMemo(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={handleAddAsset}
                    disabled={isPending || !newAssetUrl.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    이미지 추가
                  </Button>
                  {session.assets.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleDownloadAllAssets}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      전체
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 grid grid-cols-2 gap-2">
                  {session.assets.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>저장된 이미지가 없습니다</p>
                      <p className="text-xs mt-1">경쟁사 이미지 URL을 저장해보세요</p>
                    </div>
                  ) : (
                    session.assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="relative group rounded-md overflow-hidden border bg-muted/30"
                      >
                        {asset.url && (
                          <img
                            src={asset.url}
                            alt={asset.memo || '저장된 이미지'}
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={() => asset.url && window.open(asset.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={() => handleDeleteAsset(asset)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {asset.memo && (
                          <div className="p-1.5 text-[10px] truncate text-muted-foreground">
                            {asset.memo}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pages" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setAddPageDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  페이지 추가
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {session.pages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Columns className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>저장된 페이지가 없습니다</p>
                    </div>
                  ) : (
                    session.pages.map((page) => (
                      <div
                        key={page.id}
                        className={`p-2 rounded-md border ${
                          page.id === selectedPageId ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                        }`}
                      >
                        {editingPageId === page.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingPageTitle}
                              onChange={(e) => setEditingPageTitle(e.target.value)}
                              placeholder="페이지 이름"
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePageTitle(page.id)
                                if (e.key === 'Escape') handleCancelEditPage()
                              }}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-6 text-xs flex-1"
                                onClick={() => handleSavePageTitle(page.id)}
                                disabled={isPending}
                              >
                                저장
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={handleCancelEditPage}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className="cursor-pointer"
                              onClick={() => setSelectedPageId(page.id)}
                            >
                              <p className="text-sm font-medium break-words">
                                {page.title || new URL(page.url).hostname}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">{page.url}</p>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEditPage(page)
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                편집
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(page.url, '_blank')
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletePageTarget(page)
                                  setDeletePageDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={addPageDialogOpen} onOpenChange={setAddPageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비교 페이지 추가</DialogTitle>
            <DialogDescription>
              비교하고 싶은 경쟁사 페이지 URL을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pageUrl">페이지 URL *</Label>
              <Input
                id="pageUrl"
                type="url"
                placeholder="https://smartstore.naver.com/..."
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageTitle">이름 (선택)</Label>
              <Input
                id="pageTitle"
                placeholder="예: 경쟁사A 롱패딩"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPageDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddPage} disabled={isPending}>
              {isPending ? '추가 중...' : '추가하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectProductOpen} onOpenChange={setSelectProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>내 상품 선택</DialogTitle>
            <DialogDescription>
              비교할 내 상품을 선택하세요. 네이버 연동된 상품만 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="상품명 검색..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="h-9"
            />
            <ScrollArea className="h-[300px] border rounded-md">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                  <p className="text-sm">연동된 상품이 없습니다</p>
                  <p className="text-xs mt-1">재고관리에서 네이버 상품을 먼저 동기화해주세요</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                        session.my_product_id === product.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.storeName}</p>
                      </div>
                      {session.my_product_id === product.id && (
                        <Badge variant="secondary" className="text-xs">선택됨</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectProductOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deletePageDialogOpen}
        onOpenChange={setDeletePageDialogOpen}
        title="페이지 삭제"
        itemName={deletePageTarget?.title || deletePageTarget?.url}
        description="이 페이지를 목록에서 삭제하시겠습니까?"
        onConfirm={handleDeletePage}
      />
    </>
  )
}
