'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  FolderOpen,
  Archive,
  Trash2,
  ExternalLink,
  MoreVertical,
  LayoutGrid,
  List,
  Clock,
  ArrowRight,
  Sparkles,
  PackageSearch,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  createBenchmarkSession,
  updateBenchmarkSession,
  deleteBenchmarkSession,
} from '@/lib/actions/benchmark'
import type { ProductForBenchmark } from '@/lib/actions/benchmark'
import type { BenchmarkSession } from '@/types/database.types'
import { StudioWorkflow } from '@/components/product-studio/StudioWorkflow'

interface BenchmarkingClientProps {
  initialSessions: BenchmarkSession[]
  products: ProductForBenchmark[]
}

export function BenchmarkingClient({ initialSessions, products }: BenchmarkingClientProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    myPageUrl: '',
    myProductId: '',
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BenchmarkSession | null>(null)

  const filteredSessions = sessions.filter((s) =>
    activeTab === 'active' ? s.status === 'active' : s.status === 'archived'
  )

  const handleCreate = () => {
    if (!newSession.title.trim()) {
      toast.error('세션 이름을 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await createBenchmarkSession({
        title: newSession.title,
        description: newSession.description || undefined,
        myProductId: newSession.myProductId || undefined,
        myPageUrl: newSession.myPageUrl || undefined,
      })

      if (result.data) {
        setSessions([result.data, ...sessions])
        setCreateDialogOpen(false)
        setNewSession({ title: '', description: '', myPageUrl: '', myProductId: '' })
        toast.success('판매페이지 프로젝트가 생성되었습니다.')
        router.push(`/benchmarking/${result.data.id}`)
      } else {
        toast.error(result.error || '생성에 실패했습니다.')
      }
    })
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return

    const productNo = product.channelProductNo || product.platformProductId
    const productUrl = productNo
      ? product.storeUrlName
        ? `https://smartstore.naver.com/${product.storeUrlName}/products/${productNo}`
        : `https://search.shopping.naver.com/catalog/${productNo}`
      : ''

    setNewSession((current) => ({
      ...current,
      myProductId: product.id,
      myPageUrl: productUrl,
      title: current.title || `${product.name} 판매페이지 개선`,
    }))
  }

  const handleArchive = (session: BenchmarkSession) => {
    startTransition(async () => {
      const newStatus = session.status === 'active' ? 'archived' : 'active'
      const result = await updateBenchmarkSession(session.id, { status: newStatus })

      if (result.success) {
        setSessions(sessions.map((s) => (s.id === session.id ? { ...s, status: newStatus } : s)))
        toast.success(newStatus === 'archived' ? '보관처리 되었습니다.' : '활성화 되었습니다.')
      } else {
        toast.error(result.error || '처리에 실패했습니다.')
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    startTransition(async () => {
      const result = await deleteBenchmarkSession(deleteTarget.id)

      if (result.success) {
        setSessions(sessions.filter((s) => s.id !== deleteTarget.id))
        toast.success('세션이 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
      setDeleteTarget(null)
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return formatDate(dateStr)
  }

  return (
    <>
      <Header title="판매페이지 스튜디오" subtitle="RESEARCH → CREATE" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <Card className="mb-4 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-violet-500/10">
          <CardContent className="py-6 lg:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 border-primary/30 bg-background/70">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  통합 판매페이지 워크플로
                </Badge>
                <h2 className="text-xl font-bold tracking-tight lg:text-2xl">
                  조사한 근거가 AI 초안으로 바로 이어집니다
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  시장 상품과 경쟁 페이지를 모으고, 가져올 설득 원리를 정리한 뒤 내 상품의 판매페이지를 새로 만드세요.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 프로젝트
                </Button>
                <Button variant="outline" className="gap-2 bg-background/70" asChild>
                  <a href="/ai-generator">
                    AI 제작 열기 <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <StudioWorkflow activeStep={1} className="mb-6" />

        <Card>
          <CardHeader className="border-b border-border py-3">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
                <TabsList>
                  <TabsTrigger value="active" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    진행중
                    <Badge variant="secondary" className="ml-1">
                      {sessions.filter((s) => s.status === 'active').length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="gap-2">
                    <Archive className="h-4 w-4" />
                    보관함
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-2">
                  {activeTab === 'active' ? '진행중인 프로젝트가 없습니다' : '보관된 프로젝트가 없습니다'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {activeTab === 'active'
                    ? '상품을 선택해 프로젝트를 만들고 시장 조사부터 시작해보세요.'
                    : '완료된 프로젝트는 보관함으로 이동하여 관리할 수 있습니다.'}
                </p>
                {activeTab === 'active' && (
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />새 프로젝트
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => router.push(`/benchmarking/${session.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {session.title}
                          </h3>
                          {session.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {session.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchive(session)
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {session.status === 'active' ? '보관하기' : '활성화'}
                            </DropdownMenuItem>
                            {session.my_page_url && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(session.my_page_url!, '_blank')
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />내 페이지 열기
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(session)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(session.updated_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <PackageSearch className="h-3 w-3" />
                          {session.my_product_id ? '상품 연결됨' : '상품 미연결'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-3 px-2 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => router.push(`/benchmarking/${session.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-muted-foreground truncate">{session.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(session.updated_at)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(session)
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {session.status === 'active' ? '보관하기' : '활성화'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(session)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 판매페이지 프로젝트</DialogTitle>
            <DialogDescription>
              내 상품을 기준으로 조사 자료와 AI 초안을 한곳에서 관리합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">프로젝트 이름 *</Label>
              <Input
                id="title"
                placeholder="예: 여름용 쿨링팬 판매페이지 개선"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>내 상품 (권장)</Label>
              <Select value={newSession.myProductId} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="연동된 상품을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} · {product.storeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  상품관리에서 네이버 상품을 먼저 동기화하면 바로 연결할 수 있습니다.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="타깃 고객, 해결할 문제, 강조할 장점을 적어주세요."
                value={newSession.description}
                onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myPageUrl">내 상품 페이지 URL (선택)</Label>
              <Input
                id="myPageUrl"
                type="url"
                placeholder="https://smartstore.naver.com/mystore/products/..."
                value={newSession.myPageUrl}
                onChange={(e) => setNewSession({ ...newSession, myPageUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                상품을 선택하면 자동 입력되며, 직접 입력하거나 나중에 변경할 수도 있습니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? '생성 중...' : '프로젝트 시작'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="프로젝트 삭제"
        itemName={deleteTarget?.title}
        description="이 프로젝트와 관련된 모든 메모, 체크리스트, 자료가 삭제됩니다. 삭제된 데이터는 복구할 수 없습니다."
        onConfirm={handleDelete}
      />
    </>
  )
}
