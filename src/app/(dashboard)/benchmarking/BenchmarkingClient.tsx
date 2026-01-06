'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FolderOpen,
  Archive,
  Trash2,
  ExternalLink,
  MoreVertical,
  LayoutGrid,
  List,
  StickyNote,
  CheckSquare,
  Image as ImageIcon,
  Clock,
  Layers,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  createBenchmarkSession,
  updateBenchmarkSession,
  deleteBenchmarkSession,
} from '@/lib/actions/benchmark'
import type { BenchmarkSession } from '@/types/database.types'

interface BenchmarkingClientProps {
  initialSessions: BenchmarkSession[]
}

export function BenchmarkingClient({ initialSessions }: BenchmarkingClientProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSession, setNewSession] = useState({ title: '', description: '', myPageUrl: '' })

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
        myPageUrl: newSession.myPageUrl || undefined,
      })

      if (result.data) {
        setSessions([result.data, ...sessions])
        setCreateDialogOpen(false)
        setNewSession({ title: '', description: '', myPageUrl: '' })
        toast.success('벤치마킹 세션이 생성되었습니다.')
        router.push(`/benchmarking/${result.data.id}`)
      } else {
        toast.error(result.error || '생성에 실패했습니다.')
      }
    })
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
      <Header title="벤치마킹" subtitle="Benchmarking" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <Card className="mb-6 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  페이지 비교 & 분석
                </h2>
                <p className="text-sm text-muted-foreground">
                  경쟁사 페이지와 내 페이지를 나란히 비교하고, 개선점을 체크리스트로 관리하세요.
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                새 세션 만들기
              </Button>
            </div>
          </CardContent>
        </Card>

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
                  {activeTab === 'active' ? '진행중인 세션이 없습니다' : '보관된 세션이 없습니다'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {activeTab === 'active'
                    ? '새 세션을 만들어 경쟁사 페이지와 내 페이지를 비교해보세요.'
                    : '완료된 세션은 보관함으로 이동하여 관리할 수 있습니다.'}
                </p>
                {activeTab === 'active' && (
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />새 세션 만들기
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
            <DialogTitle>새 벤치마킹 세션</DialogTitle>
            <DialogDescription>
              경쟁사 페이지와 비교할 새로운 세션을 만드세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">세션 이름 *</Label>
              <Input
                id="title"
                placeholder="예: 롱패딩 상세페이지 개선"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="이 세션에서 분석하려는 내용을 간단히 적어주세요."
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
                나중에 추가하거나 변경할 수 있습니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? '생성 중...' : '세션 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="세션 삭제"
        itemName={deleteTarget?.title}
        description="이 세션과 관련된 모든 메모, 체크리스트, 자료가 삭제됩니다. 삭제된 데이터는 복구할 수 없습니다."
        onConfirm={handleDelete}
      />
    </>
  )
}
