'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  StickyNote,
  CheckSquare,
  Image as ImageIcon,
  Columns,
  Search,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { MyPagePane } from './components/MyPagePane'
import { ComparePagePane } from './components/ComparePagePane'
import { MarketResearchPanel } from './components/MarketResearchPanel'
import type { MarketProduct } from './components/MarketResearchPanel'
import { ChecklistPanel } from './components/ChecklistPanel'
import { MemoPanel } from './components/MemoPanel'
import { AssetPanel } from './components/AssetPanel'
import { PageListPanel } from './components/PageListPanel'
import { AddPageDialog } from './components/AddPageDialog'
import { SelectProductDialog } from './components/SelectProductDialog'

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

  const detectPlatform = (url: string): string => {
    if (url.includes('smartstore.naver.com')) return 'naver_smartstore'
    if (url.includes('brand.naver.com')) return 'naver_brand'
    if (url.includes('coupang.com')) return 'coupang'
    if (url.includes('gmarket.co.kr')) return 'gmarket'
    if (url.includes('11st.co.kr')) return '11st'
    return 'unknown'
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
          <MyPagePane
            myPageUrl={session.my_page_url}
            selectedProduct={selectedProduct}
            myPageZoom={myPageZoom}
            onZoomChange={setMyPageZoom}
            onOpenSelectProduct={() => setSelectProductOpen(true)}
          />

          <ComparePagePane
            pages={session.pages}
            selectedPage={selectedPage}
            selectedPageId={selectedPageId}
            comparePageZoom={comparePageZoom}
            onZoomChange={setComparePageZoom}
            onSelectPage={setSelectedPageId}
            onOpenAddPage={() => setAddPageDialogOpen(true)}
          />
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

            <MarketResearchPanel
              marketQuery={marketQuery}
              onMarketQueryChange={setMarketQuery}
              onSearch={handleMarketSearch}
              isMarketLoading={isMarketLoading}
              marketMessage={marketMessage}
              marketProducts={marketProducts}
              pages={session.pages}
              isPending={isPending}
              onAddProduct={handleAddMarketProduct}
            />

            <ChecklistPanel
              checklists={session.checklists}
              newChecklistContent={newChecklistContent}
              onNewChecklistContentChange={setNewChecklistContent}
              onAdd={handleAddChecklist}
              onToggle={handleToggleChecklist}
              onDelete={handleDeleteChecklist}
              isPending={isPending}
            />

            <MemoPanel
              memos={session.memos}
              newMemoContent={newMemoContent}
              onNewMemoContentChange={setNewMemoContent}
              newMemoColor={newMemoColor}
              onNewMemoColorChange={setNewMemoColor}
              onAdd={handleAddMemo}
              onDelete={handleDeleteMemo}
              isPending={isPending}
            />

            <AssetPanel
              assets={session.assets}
              newAssetUrl={newAssetUrl}
              onNewAssetUrlChange={setNewAssetUrl}
              newAssetMemo={newAssetMemo}
              onNewAssetMemoChange={setNewAssetMemo}
              onAdd={handleAddAsset}
              onDelete={handleDeleteAsset}
              onDownloadAll={handleDownloadAllAssets}
              isPending={isPending}
            />

            <PageListPanel
              pages={session.pages}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
              editingPageId={editingPageId}
              editingPageTitle={editingPageTitle}
              onEditingPageTitleChange={setEditingPageTitle}
              onStartEditPage={handleStartEditPage}
              onSavePageTitle={handleSavePageTitle}
              onCancelEditPage={handleCancelEditPage}
              onOpenAddPage={() => setAddPageDialogOpen(true)}
              onRequestDeletePage={(page) => {
                setDeletePageTarget(page)
                setDeletePageDialogOpen(true)
              }}
              isPending={isPending}
            />
          </Tabs>
        </div>
      </div>

      <AddPageDialog
        open={addPageDialogOpen}
        onOpenChange={setAddPageDialogOpen}
        newPageUrl={newPageUrl}
        onNewPageUrlChange={setNewPageUrl}
        newPageTitle={newPageTitle}
        onNewPageTitleChange={setNewPageTitle}
        onSubmit={handleAddPage}
        isPending={isPending}
      />

      <SelectProductDialog
        open={selectProductOpen}
        onOpenChange={setSelectProductOpen}
        products={products}
        productSearchQuery={productSearchQuery}
        onProductSearchQueryChange={setProductSearchQuery}
        myProductId={session.my_product_id}
        onSelectProduct={handleSelectProduct}
      />

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
