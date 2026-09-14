'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, Loader2, RefreshCw, Save, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import { getMarketAccounts, type MarketAccountInfo } from '@/lib/actions/market-accounts'
import {
  getSyncRuns,
  getSyncSchedules,
  toggleSyncSchedule,
  upsertSyncSchedule,
  type SyncRunView,
  type SyncScheduleView,
  type SyncType,
} from '@/lib/actions/sync-schedules'

// One schedule per market account. Execution is external cron hitting
// /api/cron/sync, so this tab owns definitions and shows run history.

const INTERVAL_OPTIONS = [
  { value: 30, label: '30분마다' },
  { value: 60, label: '1시간마다' },
  { value: 120, label: '2시간마다' },
  { value: 360, label: '6시간마다' },
  { value: 720, label: '12시간마다' },
  { value: 1440, label: '하루 한 번' },
]

const SYNC_TYPE_LABELS: Record<SyncType, string> = {
  orders: '주문만',
  products: '상품만',
  both: '주문 + 상품',
}

function formatDateTime(value: string | null) {
  if (!value) return '없음'
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface DraftState {
  syncType: SyncType
  intervalMinutes: number
  syncTime: string
  isEnabled: boolean
}

function AccountScheduleCard({
  account,
  schedule,
  onSaved,
}: {
  account: MarketAccountInfo
  schedule: SyncScheduleView | undefined
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<DraftState>({
    syncType: schedule?.syncType || 'both',
    intervalMinutes: schedule?.intervalMinutes || 60,
    syncTime: schedule?.syncTime || '09:00',
    isEnabled: schedule?.isEnabled ?? false,
  })
  const [isSaving, setIsSaving] = useState(false)

  const save = async (patch?: Partial<DraftState>) => {
    const next = { ...draft, ...patch }
    setIsSaving(true)
    try {
      const result = await upsertSyncSchedule({
        marketAccountId: account.id,
        syncType: next.syncType,
        intervalMinutes: next.intervalMinutes,
        syncTime: next.intervalMinutes >= 1440 ? next.syncTime : null,
        isEnabled: next.isEnabled,
      })
      if (result.success) {
        toast.success(`${account.name} 자동 동기화 설정이 저장되었습니다.`)
        onSaved()
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (isEnabled: boolean) => {
    setDraft((current) => ({ ...current, isEnabled }))
    if (!schedule) {
      await save({ isEnabled })
      return
    }
    const result = await toggleSyncSchedule(schedule.id, isEnabled)
    if (result.success) {
      toast.success(isEnabled ? '자동 동기화를 켰습니다.' : '자동 동기화를 껐습니다.')
      onSaved()
    } else {
      toast.error(result.error || '변경에 실패했습니다.')
      setDraft((current) => ({ ...current, isEnabled: !isEnabled }))
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <PlatformBadge platform={account.platform} label={account.name} />
            {schedule?.isEnabled && (
              <Badge variant="secondary" className="text-[10px]">
                동작 중
              </Badge>
            )}
          </span>
          <Switch checked={draft.isEnabled} onCheckedChange={handleToggle} />
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3 p-4', !draft.isEnabled && 'opacity-60')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">동기화 대상</Label>
            <Select
              value={draft.syncType}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, syncType: value as SyncType }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SYNC_TYPE_LABELS) as SyncType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {SYNC_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">주기</Label>
            <Select
              value={String(draft.intervalMinutes)}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, intervalMinutes: Number(value) }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {draft.intervalMinutes >= 1440 && (
            <div className="space-y-1.5">
              <Label className="text-xs">실행 시각</Label>
              <Select
                value={draft.syncTime}
                onValueChange={(value) => setDraft((current) => ({ ...current, syncTime: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`).map(
                    (time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            마지막 실행: {formatDateTime(schedule?.lastSyncAt || null)}
          </p>
          <Button size="sm" onClick={() => save()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AutomationTab() {
  const [accounts, setAccounts] = useState<MarketAccountInfo[]>([])
  const [schedules, setSchedules] = useState<SyncScheduleView[]>([])
  const [runs, setRuns] = useState<SyncRunView[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [accountsResult, schedulesResult, runsResult] = await Promise.all([
        getMarketAccounts(),
        getSyncSchedules(),
        getSyncRuns(10),
      ])
      if (accountsResult.data) setAccounts(accountsResult.data)
      if (schedulesResult.data) setSchedules(schedulesResult.data)
      if (runsResult.data) setRuns(runsResult.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            자동 동기화
          </CardTitle>
          <CardDescription>
            마켓 계정별로 주문·상품을 주기적으로 수집합니다. 실제 실행은 서버 크론이 담당하며,
            여기서는 주기와 대상만 정합니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          연결된 마켓 계정이 없습니다. 마켓 계정 탭에서 먼저 연결해주세요.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountScheduleCard
              key={account.id}
              account={account}
              schedule={schedules.find((item) => item.marketAccountId === account.id)}
              onSaved={load}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            최근 실행 기록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 실행 기록이 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-28 shrink-0 truncate text-muted-foreground">
                    {run.marketAccountName}
                  </span>
                  <span className="w-16 shrink-0">{run.syncType}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {run.trigger === 'scheduled' ? '자동' : '수동'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px]',
                      run.status === 'completed' && 'border-green-500/20 bg-green-500/10 text-green-600',
                      run.status === 'partial' && 'border-warning/20 bg-warning/10 text-warning',
                      run.status === 'failed' && 'border-destructive/20 bg-destructive/10 text-destructive'
                    )}
                  >
                    {run.status}
                  </Badge>
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {run.errorMessage || `처리 ${run.itemsProcessed}건${run.itemsFailed > 0 ? `, 실패 ${run.itemsFailed}건` : ''}`}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(run.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            배송 상태 자동 확인
          </CardTitle>
          <CardDescription>
            배송 추적 기능을 새 구조로 옮기는 작업과 함께 다시 제공될 예정입니다.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
