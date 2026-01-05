'use client'

import { useState, useEffect, useTransition } from 'react'
import { Save, LogOut, User, Key, Bell, Loader2, CheckCircle, RefreshCw, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getUserProfile,
  getStoreProfile,
  createOrUpdateStore,
} from '@/lib/actions/settings'
import { testNaverConnection } from '@/lib/actions/naver-sync'
import {
  getSyncScheduleByStore,
  createOrUpdateSyncSchedule,
  type SyncType,
} from '@/lib/actions/sync-schedules'
import { StoreManagement } from '@/components/settings/StoreManagement'
import type { Platform } from '@/types/database.types'

export default function SettingsPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [profile, setProfile] = useState({
    email: '',
    storeName: '',
    platform: 'Naver' as Platform,
  })

  const [apiKeys, setApiKeys] = useState({
    naverClientId: '',
    naverClientSecret: '',
    openaiApiKey: '',
  })

  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderStatus: true,
    aiComplete: false,
  })

  const [syncSettings, setSyncSettings] = useState({
    storeId: '',
    syncType: 'both' as SyncType,
    intervalMinutes: 60,
    isEnabled: false,
    lastSyncAt: null as string | null,
    nextSyncAt: null as string | null,
  })

  useEffect(() => {
    async function loadProfile() {
      const [userResult, storeResult] = await Promise.all([
        getUserProfile(),
        getStoreProfile(),
      ])

      if (userResult.data) {
        setProfile((prev) => ({
          ...prev,
          email: userResult.data!.email,
        }))
      }

      if (storeResult.data) {
        setProfile((prev) => ({
          ...prev,
          storeName: storeResult.data!.storeName,
          platform: storeResult.data!.platform,
        }))
        setApiKeys({
          naverClientId: storeResult.data.apiConfig.naverClientId || '',
          naverClientSecret: storeResult.data.apiConfig.naverClientSecret || '',
          openaiApiKey: storeResult.data.apiConfig.openaiApiKey || '',
        })

        const scheduleResult = await getSyncScheduleByStore(storeResult.data.id)
        if (scheduleResult.data) {
          setSyncSettings({
            storeId: storeResult.data.id,
            syncType: scheduleResult.data.syncType,
            intervalMinutes: scheduleResult.data.intervalMinutes,
            isEnabled: scheduleResult.data.isEnabled,
            lastSyncAt: scheduleResult.data.lastSyncAt,
            nextSyncAt: scheduleResult.data.nextSyncAt,
          })
        } else {
          setSyncSettings((prev) => ({
            ...prev,
            storeId: storeResult.data!.id,
          }))
        }
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [])

  const handleSaveProfile = () => {
    if (!profile.storeName) {
      toast.error('스토어 이름을 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await createOrUpdateStore({
        storeName: profile.storeName,
        platform: profile.platform,
        naverClientId: apiKeys.naverClientId || undefined,
        naverClientSecret: apiKeys.naverClientSecret || undefined,
        openaiApiKey: apiKeys.openaiApiKey || undefined,
      })

      if (result.success) {
        toast.success('설정이 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleTestConnection = async () => {
    if (!apiKeys.naverClientId || !apiKeys.naverClientSecret) {
      toast.error('네이버 API 키를 먼저 입력해주세요.')
      return
    }

    setIsTesting(true)
    try {
      const result = await testNaverConnection()
      if (result.success) {
        toast.success('네이버 API 연결 성공!')
      } else {
        toast.error(result.error || '연결 테스트 실패')
      }
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestOpenAI = async () => {
    if (!apiKeys.openaiApiKey) {
      toast.error('OpenAI API 키를 먼저 입력하고 저장해주세요.')
      return
    }

    setIsTestingOpenAI(true)
    try {
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success(result.message, {
          description: `사용 가능 모델: ${result.details.modelsAvailable}개 (GPT-4: ${result.details.gpt4Available ? 'O' : 'X'})`,
        })
      } else {
        toast.error(result.error || '연결 테스트 실패')
      }
    } catch {
      toast.error('연결 테스트 중 오류가 발생했습니다.')
    } finally {
      setIsTestingOpenAI(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('로그아웃되었습니다.')
    router.push('/login')
    router.refresh()
  }

  const handleSaveSyncSettings = () => {
    if (!syncSettings.storeId) {
      toast.error('스토어 설정을 먼저 저장해주세요.')
      return
    }

    startTransition(async () => {
      const result = await createOrUpdateSyncSchedule({
        storeId: syncSettings.storeId,
        syncType: syncSettings.syncType,
        intervalMinutes: syncSettings.intervalMinutes,
        isEnabled: syncSettings.isEnabled,
      })

      if (result.success) {
        toast.success('동기화 설정이 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
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

  if (isLoading) {
    return (
      <>
        <Header title="설정" subtitle="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="설정" subtitle="Settings" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="max-w-2xl space-y-6">
          <StoreManagement />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>프로필 정보</CardTitle>
                  <CardDescription>계정 및 스토어 기본 정보</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeName">스토어 이름</Label>
                <Input
                  id="storeName"
                  value={profile.storeName}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  placeholder="내 스마트스토어"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">플랫폼</Label>
                <Select
                  value={profile.platform}
                  onValueChange={(value) =>
                    setProfile((prev) => ({ ...prev, platform: value as Platform }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naver">네이버 스마트스토어</SelectItem>
                    <SelectItem value="Coupang">쿠팡</SelectItem>
                    <SelectItem value="Gmarket">G마켓</SelectItem>
                    <SelectItem value="11st">11번가</SelectItem>
                    <SelectItem value="Other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>API 설정</CardTitle>
                  <CardDescription>외부 서비스 연동 키</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">네이버 커머스 API</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting || !apiKeys.naverClientId || !apiKeys.naverClientSecret}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    연결 테스트
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  네이버 커머스 센터에서 발급받은 API 키를 입력하세요.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="naverClientId">Client ID</Label>
                  <Input
                    id="naverClientId"
                    type="text"
                    value={apiKeys.naverClientId}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, naverClientId: e.target.value }))
                    }
                    placeholder="애플리케이션 Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naverClientSecret">Client Secret</Label>
                  <Input
                    id="naverClientSecret"
                    type="password"
                    value={apiKeys.naverClientSecret}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, naverClientSecret: e.target.value }))
                    }
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">OpenAI API</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestOpenAI}
                    disabled={isTestingOpenAI || !apiKeys.openaiApiKey}
                  >
                    {isTestingOpenAI ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    연결 테스트
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI 상세페이지 생성 기능에 사용됩니다.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="openaiKey">API 키</Label>
                  <Input
                    id="openaiKey"
                    type="password"
                    value={apiKeys.openaiApiKey}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, openaiApiKey: e.target.value }))
                    }
                    placeholder="sk-••••••••••••••••"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="15">15분마다</SelectItem>
                      <SelectItem value="30">30분마다</SelectItem>
                      <SelectItem value="60">1시간마다</SelectItem>
                      <SelectItem value="120">2시간마다</SelectItem>
                      <SelectItem value="360">6시간마다</SelectItem>
                      <SelectItem value="720">12시간마다</SelectItem>
                      <SelectItem value="1440">하루 1회</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {syncSettings.isEnabled && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
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
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>알림 설정</CardTitle>
                  <CardDescription>푸시 알림 및 이메일 알림</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">신규 주문 알림</p>
                  <p className="text-sm text-muted-foreground">
                    새 주문이 들어오면 알림
                  </p>
                </div>
                <Switch
                  checked={notifications.newOrders}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, newOrders: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">배송 상태 변경</p>
                  <p className="text-sm text-muted-foreground">
                    주문 상태가 변경되면 알림
                  </p>
                </div>
                <Switch
                  checked={notifications.orderStatus}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, orderStatus: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI 작업 완료</p>
                  <p className="text-sm text-muted-foreground">
                    AI 콘텐츠 생성이 완료되면 알림
                  </p>
                </div>
                <Switch
                  checked={notifications.aiComplete}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, aiComplete: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSaveProfile} disabled={isPending} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isPending ? '저장 중...' : '변경사항 저장'}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
