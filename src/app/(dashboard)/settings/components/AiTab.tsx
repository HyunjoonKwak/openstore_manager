'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, Plug, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  getAiSettingsView,
  saveAiSettings,
  clearAiApiKey,
  type AiSettingsView,
} from '@/lib/actions/ai-settings'
import { getAiUsageSummary, type UsageSummary } from '@/lib/actions/ai-usage'

const USAGE_TYPE_LABELS: Record<string, string> = {
  benchmarking_structure: '벤치마킹 (구조)',
  benchmarking_style: '벤치마킹 (스타일)',
  benchmarking_image: '벤치마킹 (이미지)',
  ai_generate: 'AI 콘텐츠 생성',
  ai_analyze: 'AI 페이지 분석',
}

// AI settings — Anthropic key + monthly spend cap. The cap is enforced
// server-side in callClaude(); this tab only reads and writes it.

const LIMIT_PRESETS = [0, 3000, 10000, 30000]

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`
}

export function AiTab() {
  const [view, setView] = useState<AiSettingsView | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [limit, setLimit] = useState('3000')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    const [result, usageResult] = await Promise.all([getAiSettingsView(), getAiUsageSummary(30)])
    if (usageResult.data) setUsage(usageResult.data)
    if (result.data) {
      setView(result.data)
      setLimit(String(result.data.monthlyLimitKrw))
    } else if (result.error) {
      toast.error(result.error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    const parsedLimit = Number(limit)
    if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
      toast.error('월 한도는 0 이상의 정수로 입력해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveAiSettings({
        apiKey: apiKey.trim() || undefined,
        monthlyLimitKrw: parsedLimit,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setApiKey('')
      toast.success('AI 설정을 저장했습니다.')
      await load()
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/ai/test-connection', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message ?? 'Anthropic API 연결 성공!')
      } else {
        toast.error(data.error ?? '연결 테스트에 실패했습니다.')
      }
    } catch {
      toast.error('연결 테스트 요청에 실패했습니다.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleClear = async () => {
    const result = await clearAiApiKey()
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('저장된 API 키를 삭제했습니다.')
    setDeleteOpen(false)
    await load()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const usageRatio =
    view && view.monthlyLimitKrw > 0
      ? Math.min(100, Math.round((view.spentKrw / view.monthlyLimitKrw) * 100))
      : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Anthropic API 키
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            AI 기능은 Claude <span className="font-medium">{view?.model}</span> 모델을 씁니다. 키는
            암호화해 저장되며 화면에 다시 표시되지 않습니다.
          </p>

          <div className="space-y-2">
            <Label htmlFor="anthropic-key">API 키</Label>
            <Input
              id="anthropic-key"
              type="password"
              autoComplete="off"
              placeholder={view?.hasOwnKey ? '저장됨 — 변경할 때만 입력' : 'sk-ant-...'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {view?.hasOwnKey
                ? '이 계정에 저장된 키를 사용 중입니다.'
                : view?.hasKey
                  ? '서버 환경변수(ANTHROPIC_API_KEY)의 키를 사용 중입니다.'
                  : '키가 없어 AI 기능이 비활성 상태입니다.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting || !view?.hasKey}>
              {isTesting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="mr-1.5 h-3.5 w-3.5" />
              )}
              연결 테스트
            </Button>
            {view?.hasOwnKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                저장된 키 삭제
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">월 사용 한도</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            이번 달 누적 비용이 한도에 닿으면 AI 호출이 자동으로 멈춥니다. 0원으로 두면 AI 기능이
            꺼집니다.
          </p>

          <div className="space-y-2">
            <Label htmlFor="ai-limit">한도 (원/월)</Label>
            <Input
              id="ai-limit"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="max-w-[200px]"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {LIMIT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={Number(limit) === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLimit(String(preset))}
                >
                  {preset === 0 ? 'AI 끄기' : formatKrw(preset)}
                </Button>
              ))}
            </div>
          </div>

          {view && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">이번 달 사용</span>
                <span className="font-medium tabular-nums">
                  {formatKrw(view.spentKrw)} / {formatKrw(view.monthlyLimitKrw)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${view.exceeded ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${usageRatio}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>호출 {view.callCount.toLocaleString()}회</span>
                <span>
                  {view.exceeded ? '한도 소진 — AI 호출 중지됨' : `잔여 ${formatKrw(view.remainingKrw)}`}
                </span>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            저장
          </Button>
        </CardContent>
      </Card>

      {usage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">사용량 상세 (최근 30일)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">총 토큰</p>
                <p className="text-lg font-semibold tabular-nums">
                  {usage.totalTokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">입력 토큰</p>
                <p className="text-lg font-semibold tabular-nums">
                  {usage.totalPromptTokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">출력 토큰</p>
                <p className="text-lg font-semibold tabular-nums">
                  {usage.totalCompletionTokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">예상 비용</p>
                <p className="text-lg font-semibold text-primary tabular-nums">
                  {usage.totalCostKrw}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
              {Object.entries(usage.usageByType).map(([type, stat]) => (
                <div key={type} className="flex justify-between rounded bg-muted/30 px-2.5 py-1.5">
                  <span className="text-muted-foreground">{USAGE_TYPE_LABELS[type] ?? type}</span>
                  <span className="font-medium tabular-nums">{stat.count}회</span>
                </div>
              ))}
            </div>

            {usage.totalTokens === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                아직 AI 기능을 사용하지 않았습니다.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="저장된 API 키를 삭제할까요?"
        description="이 계정에 저장된 Anthropic 키가 지워집니다. 서버 환경변수에 키가 있으면 그 키로 대체됩니다."
        onConfirm={handleClear}
      />
    </div>
  )
}
