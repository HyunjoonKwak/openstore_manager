'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Save, RefreshCw, Clock, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SyncType } from '@/lib/actions/sync-schedules'

export interface SyncSettingsState {
  storeId: string
  syncType: SyncType
  intervalMinutes: number
  syncTime: string
  syncAtMinute: 0 | 30
  isEnabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
}

export interface DeliveryCheckSettingsState {
  times: number[]
  enabled: boolean
}

interface AutomationTabProps {
  syncSettings: SyncSettingsState
  setSyncSettings: Dispatch<SetStateAction<SyncSettingsState>>
  deliveryCheckSettings: DeliveryCheckSettingsState
  setDeliveryCheckSettings: Dispatch<SetStateAction<DeliveryCheckSettingsState>>
  toggleDeliveryCheckTime: (hour: number) => void
  handleSaveSyncSettings: () => void
  handleSaveDeliveryCheckSettings: () => void
  isPending: boolean
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AutomationTab({
  syncSettings,
  setSyncSettings,
  deliveryCheckSettings,
  setDeliveryCheckSettings,
  toggleDeliveryCheckTime,
  handleSaveSyncSettings,
  handleSaveDeliveryCheckSettings,
  isPending,
}: AutomationTabProps) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>자동 동기화 설정</CardTitle>
              <CardDescription>주문/상품 자동 동기화 스케줄</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">자동 동기화 활성화</p>
              <p className="text-sm text-muted-foreground">
                설정된 간격으로 자동 동기화
              </p>
            </div>
            <Switch
              checked={syncSettings.isEnabled}
              onCheckedChange={(checked) =>
                setSyncSettings((prev) => ({ ...prev, isEnabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>동기화 대상</Label>
              <Select
                value={syncSettings.syncType}
                onValueChange={(value) =>
                  setSyncSettings((prev) => ({
                    ...prev,
                    syncType: value as SyncType,
                  }))
                }
                disabled={!syncSettings.isEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orders">주문만</SelectItem>
                  <SelectItem value="products">상품만</SelectItem>
                  <SelectItem value="both">주문 + 상품</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>동기화 간격</Label>
              <Select
                value={String(syncSettings.intervalMinutes)}
                onValueChange={(value) =>
                  setSyncSettings((prev) => ({
                    ...prev,
                    intervalMinutes: Number(value),
                  }))
                }
                disabled={!syncSettings.isEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1시간마다</SelectItem>
                  <SelectItem value="120">2시간마다</SelectItem>
                  <SelectItem value="360">6시간마다</SelectItem>
                  <SelectItem value="720">12시간마다</SelectItem>
                  <SelectItem value="1440">하루 1회</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>동기화 시점</Label>
              {syncSettings.intervalMinutes === 1440 ? (
                <Select
                  value={syncSettings.syncTime}
                  onValueChange={(value) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      syncTime: value,
                    }))
                  }
                  disabled={!syncSettings.isEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0')
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={String(syncSettings.syncAtMinute)}
                  onValueChange={(value) =>
                    setSyncSettings((prev) => ({
                      ...prev,
                      syncAtMinute: Number(value) as 0 | 30,
                    }))
                  }
                  disabled={!syncSettings.isEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">매 정시 (00분)</SelectItem>
                    <SelectItem value="30">매 30분 (30분)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                {syncSettings.intervalMinutes === 1440
                  ? `매일 ${syncSettings.syncTime}에 동기화`
                  : syncSettings.syncAtMinute === 0
                    ? '매 정시에 동기화 (예: 09:00, 10:00, 11:00...)'
                    : '매 30분에 동기화 (예: 09:30, 10:30, 11:30...)'}
              </p>
            </div>
          </div>

          {syncSettings.isEnabled && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">마지막 동기화: </span>
                  <span className="font-medium">{formatDateTime(syncSettings.lastSyncAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">다음 동기화: </span>
                  <span className="font-medium">{formatDateTime(syncSettings.nextSyncAt)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveSyncSettings}
            disabled={isPending || !syncSettings.storeId}
          >
            <Save className="h-4 w-4 mr-2" />
            동기화 설정 저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>배송 상태 자동 확인</CardTitle>
              <CardDescription>택배사 API로 배송 상태를 자동 확인합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">자동 확인 활성화</p>
              <p className="text-sm text-muted-foreground">
                설정된 시간에 배송 상태를 자동으로 확인
              </p>
            </div>
            <Switch
              checked={deliveryCheckSettings.enabled}
              onCheckedChange={(checked) =>
                setDeliveryCheckSettings((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>확인 시간 선택 (KST)</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[6, 9, 12, 15, 18, 21].map((hour) => (
                <Button
                  key={hour}
                  variant={deliveryCheckSettings.times.includes(hour) ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleDeliveryCheckTime(hour)}
                  disabled={!deliveryCheckSettings.enabled}
                >
                  {hour}:00
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              선택한 시간에 발송처리/배송중 상태의 주문들을 자동으로 확인합니다.
            </p>
          </div>

          {deliveryCheckSettings.enabled && deliveryCheckSettings.times.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                매일{' '}
                {deliveryCheckSettings.times.map((t) => `${t}:00`).join(', ')}
                에 자동 확인
              </span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveDeliveryCheckSettings}
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            배송확인 설정 저장
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
