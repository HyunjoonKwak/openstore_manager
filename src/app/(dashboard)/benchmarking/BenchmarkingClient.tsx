'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  BarChart3,
  Puzzle,
  ImageIcon,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { deleteAnalysisLog, type AnalysisLog } from '@/lib/actions/analysis'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'

interface BenchmarkingClientProps {
  initialLogs: AnalysisLog[]
}

export function BenchmarkingClient({ initialLogs }: BenchmarkingClientProps) {
  const router = useRouter()
  const [logs, setLogs] = useState(initialLogs)
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AnalysisLog | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return

    startTransition(async () => {
      const result = await deleteAnalysisLog(deleteTarget.id)
      if (result.success) {
        setLogs(logs.filter(l => l.id !== deleteTarget.id))
        toast.success('분석 기록이 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
      setDeleteTarget(null)
    })
  }

  const openDeleteDialog = (log: AnalysisLog) => {
    setDeleteTarget(log)
    setDeleteDialogOpen(true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            완료
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            대기중
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            실패
          </Badge>
        )
      default:
        return null
    }
  }

  const getPlatformBadge = (platform: string) => {
    if (platform === 'naver_smart_store') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
          네이버 스마트스토어
        </Badge>
      )
    }
    if (platform === 'screenshot') {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
          <ImageIcon className="h-3 w-3 mr-1" />
          스크린샷
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {platform}
      </Badge>
    )
  }

  const extractDisplayName = (url: string) => {
    if (url.startsWith('image://')) {
      return url.replace('image://', '')
    }
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      const storeName = pathParts[1] || urlObj.hostname
      return storeName
    } catch {
      return url
    }
  }

  return (
    <>
      <Header title="벤치마킹 분석" subtitle="Benchmarking" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <Card className="mb-6 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border-purple-500/20">
          <CardContent className="py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-purple-600" />
                  새 분석 시작하기
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  크롬 익스텐션을 사용하여 네이버 스마트스토어 상품 페이지를 AI로 분석합니다.
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>1. 크롬 익스텐션 설치 (처음 한 번만)</li>
                  <li>2. 분석하고 싶은 스마트스토어 상품 페이지 방문</li>
                  <li>3. 익스텐션 아이콘 클릭 → &quot;AI 분석 시작&quot;</li>
                </ol>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="gap-2">
                    <Link href="/benchmarking/guide">
                      <Puzzle className="h-4 w-4" />
                      익스텐션 설치 가이드
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="gap-2">
                    <a href="https://smartstore.naver.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      스마트스토어 가기
                    </a>
                  </Button>
                </div>
              </div>
              <div className="lg:w-64 p-4 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">분석 가능 플랫폼</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">네이버 스마트스토어</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">네이버 브랜드스토어</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">쿠팡 (준비중)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">분석 기록</CardTitle>
              <Badge variant="secondary">{logs.length}건</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-2">분석 기록이 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  크롬 익스텐션을 설치하고 네이버 스마트스토어 상품 페이지에서 분석을 시작하세요.
                </p>
                <Button asChild variant="outline">
                  <Link href="/benchmarking/guide">
                    익스텐션 설치 방법 보기
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(log.status)}
                          {getPlatformBadge(log.targetPlatform)}
                        </div>
                        <p className="font-medium truncate mb-1">
                          {extractDisplayName(log.targetUrl)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {log.targetUrl}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {log.status === 'completed' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => router.push(`/analysis/${log.id}`)}
                          >
                            결과 보기
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(log.targetUrl, '_blank')}
                          title="원본 페이지 열기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(log)}
                          disabled={isPending}
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="분석 기록 삭제"
        itemName={deleteTarget ? extractDisplayName(deleteTarget.targetUrl) : undefined}
        description="이 분석 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다."
        onConfirm={handleDelete}
      />
    </>
  )
}
