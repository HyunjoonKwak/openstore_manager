'use client'

import { useState, useEffect, useTransition } from 'react'
import { Save, LogOut, User, Key, Bell, Loader2, CheckCircle, RefreshCw, Clock, MessageSquare, ExternalLink, AlertCircle, Phone, Zap, TrendingUp, Truck, Palette, FolderOpen, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getUserProfile,
  getStoreProfile,
  createOrUpdateStore,
  updateDeliveryCheckSettings,
  updateNotificationSettings,
} from '@/lib/actions/settings'
import { testNaverConnection } from '@/lib/actions/naver-sync'
import {
  getSyncScheduleByStore,
  createOrUpdateSyncSchedule,
  type SyncType,
} from '@/lib/actions/sync-schedules'
import { StoreManagement } from '@/components/settings/StoreManagement'
import { ThemeSelector } from '@/components/ui/ThemeToggle'
import { getAiUsageSummary, type UsageSummary } from '@/lib/actions/ai-usage'
import { useDefaultFolder } from '@/hooks/useDefaultFolder'
import type { Platform } from '@/types/database.types'

export default function SettingsPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [notificationApiKeys, setNotificationApiKeys] = useState({
    coolsmsApiKey: '',
    coolsmsApiSecret: '',
    coolsmsSenderId: '',
    kakaoApiKey: '',
    kakaoSenderId: '',
    kakaoTemplateId: '',
  })
  const [notificationStatus, setNotificationStatus] = useState({
    smsConfigured: false,
    kakaoConfigured: false,
  })

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
    syncTime: '09:00',
    syncAtMinute: 0 as 0 | 30,
    isEnabled: false,
    lastSyncAt: null as string | null,
    nextSyncAt: null as string | null,
  })

  const [aiUsage, setAiUsage] = useState<UsageSummary | null>(null)

  const [deliveryCheckSettings, setDeliveryCheckSettings] = useState({
    times: [9, 15, 21] as number[],
    enabled: true,
  })

  const [discordSettings, setDiscordSettings] = useState({
    webhookUrl: '',
    enabled: false,
  })

  const {
    orderDownloadPath,
    trackingUploadPath,
    setOrderDownloadPath,
    setTrackingUploadPath,
    isLoaded: isFolderSettingsLoaded,
  } = useDefaultFolder()

  const [useSameFolder, setUseSameFolder] = useState(false)

  useEffect(() => {
    if (isFolderSettingsLoaded && orderDownloadPath && orderDownloadPath === trackingUploadPath) {
      setUseSameFolder(true)
    }
  }, [isFolderSettingsLoaded, orderDownloadPath, trackingUploadPath])

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
        if (storeResult.data.deliveryCheckSettings) {
          setDeliveryCheckSettings(storeResult.data.deliveryCheckSettings)
        }
        if (storeResult.data.notificationSettings) {
          setDiscordSettings(storeResult.data.notificationSettings)
        }

        const scheduleResult = await getSyncScheduleByStore(storeResult.data.id)
        if (scheduleResult.data) {
          setSyncSettings((prev) => ({
            ...prev,
            storeId: storeResult.data!.id,
            syncType: scheduleResult.data!.syncType,
            intervalMinutes: scheduleResult.data!.intervalMinutes,
            isEnabled: scheduleResult.data!.isEnabled,
            lastSyncAt: scheduleResult.data!.lastSyncAt,
            nextSyncAt: scheduleResult.data!.nextSyncAt,
            syncAtMinute: scheduleResult.data!.syncAtMinute,
            syncTime: scheduleResult.data!.syncTime ?? '09:00',
          }))
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
    checkNotificationStatus()
    loadAiUsage()
  }, [])

  const loadAiUsage = async () => {
    const result = await getAiUsageSummary(30)
    if (result.data) {
      setAiUsage(result.data)
    }
  }

  const checkNotificationStatus = async () => {
    try {
      const response = await fetch('/api/notifications/status')
      if (response.ok) {
        const data = await response.json()
        setNotificationStatus(data)
      }
    } catch {
      console.log('Notification status check failed')
    }
  }

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
        syncAtMinute: syncSettings.syncAtMinute,
        syncTime: syncSettings.syncTime,
      })

      if (result.success) {
        toast.success('동기화 설정이 저장되었습니다.')
        const scheduleResult = await getSyncScheduleByStore(syncSettings.storeId)
        if (scheduleResult.data) {
          setSyncSettings((prev) => ({
            ...prev,
            nextSyncAt: scheduleResult.data!.nextSyncAt,
          }))
        }
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleSaveDeliveryCheckSettings = () => {
    startTransition(async () => {
      const result = await updateDeliveryCheckSettings(deliveryCheckSettings)

      if (result.success) {
        toast.success('배송확인 설정이 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const toggleDeliveryCheckTime = (hour: number) => {
    setDeliveryCheckSettings((prev) => {
      const newTimes = prev.times.includes(hour)
        ? prev.times.filter((t) => t !== hour)
        : [...prev.times, hour].sort((a, b) => a - b)
      return { ...prev, times: newTimes }
    })
  }

  const handleSaveDiscordSettings = () => {
    startTransition(async () => {
      const result = await updateNotificationSettings({
        webhookUrl: discordSettings.webhookUrl,
        enabled: discordSettings.enabled,
      })

      if (result.success) {
        toast.success('Discord 알림 설정이 저장되었습니다.')
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    })
  }

  const handleTestDiscordWebhook = async () => {
    if (!discordSettings.webhookUrl) {
      toast.error('Discord 웹훅 URL을 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/notifications/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordSettings.webhookUrl }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success('테스트 메시지가 전송되었습니다.')
      } else {
        toast.error(result.error || '테스트 전송에 실패했습니다.')
      }
    } catch {
      toast.error('테스트 전송 중 오류가 발생했습니다.')
    }
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

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">설정 센터</p>
              <p className="text-sm text-muted-foreground">
                필요한 영역만 열어보고, 기본 정보와 API 변경사항은 여기서 저장하세요.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleSaveProfile} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                기본 정보 · API 저장
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>

          <Tabs
            defaultValue="general"
            className="gap-4 [&_[data-slot=card]]:gap-4 [&_[data-slot=card]]:py-5 [&_[data-slot=card-content]]:px-5 [&_[data-slot=card-header]]:px-5"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
              <TabsTrigger value="general" className="py-2.5">
                <User className="h-4 w-4" />
                기본 설정
              </TabsTrigger>
              <TabsTrigger value="integrations" className="py-2.5">
                <Key className="h-4 w-4" />
                서비스 연동
              </TabsTrigger>
              <TabsTrigger value="automation" className="py-2.5">
                <RefreshCw className="h-4 w-4" />
                자동화
              </TabsTrigger>
              <TabsTrigger value="notifications" className="py-2.5">
                <Bell className="h-4 w-4" />
                알림
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0">
              <div className="grid items-start gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>테마 설정</CardTitle>
                  <CardDescription>화면 테마를 선택하세요</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>기본 폴더 설정</CardTitle>
                  <CardDescription>주문 다운로드 및 운송장 업로드 기본 경로</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">동일 폴더 사용</p>
                  <p className="text-sm text-muted-foreground">
                    다운로드와 업로드에 같은 폴더 사용
                  </p>
                </div>
                <Switch
                  checked={useSameFolder}
                  onCheckedChange={(checked) => {
                    setUseSameFolder(checked)
                    if (checked && orderDownloadPath) {
                      setTrackingUploadPath(orderDownloadPath)
                    }
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="orderDownloadPath">주문 다운로드 폴더</Label>
                <div className="flex gap-2">
                  <Input
                    id="orderDownloadPath"
                    value={orderDownloadPath}
                    onChange={(e) => {
                      setOrderDownloadPath(e.target.value)
                      if (useSameFolder) {
                        setTrackingUploadPath(e.target.value)
                      }
                    }}
                    placeholder="예: C:\Downloads\주문 또는 /Users/username/Downloads/orders"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      try {
                        const windowWithPicker = window as Window & { showDirectoryPicker?: () => Promise<{ name: string }> }
                        if (!windowWithPicker.showDirectoryPicker) {
                          toast.error('폴더 선택이 지원되지 않는 브라우저입니다.')
                          return
                        }
                        const dirHandle = await windowWithPicker.showDirectoryPicker()
                        const path = dirHandle.name
                        setOrderDownloadPath(path)
                        if (useSameFolder) {
                          setTrackingUploadPath(path)
                        }
                        toast.success(`폴더 선택: ${path}`)
                      } catch (e: unknown) {
                        if (e instanceof Error && e.name !== 'AbortError') {
                          toast.error('폴더 선택이 지원되지 않는 브라우저입니다.')
                        }
                      }
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  주문 엑셀 파일을 다운로드할 기본 폴더 경로
                </p>
              </div>

              {!useSameFolder && (
                <div className="space-y-2">
                  <Label htmlFor="trackingUploadPath">운송장 업로드 폴더</Label>
                  <div className="flex gap-2">
                    <Input
                      id="trackingUploadPath"
                      value={trackingUploadPath}
                      onChange={(e) => setTrackingUploadPath(e.target.value)}
                      placeholder="예: C:\Downloads\운송장 또는 /Users/username/Downloads/tracking"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        try {
                          const windowWithPicker = window as Window & { showDirectoryPicker?: () => Promise<{ name: string }> }
                          if (!windowWithPicker.showDirectoryPicker) {
                            toast.error('폴더 선택이 지원되지 않는 브라우저입니다.')
                            return
                          }
                          const dirHandle = await windowWithPicker.showDirectoryPicker()
                          const path = dirHandle.name
                          setTrackingUploadPath(path)
                          toast.success(`폴더 선택: ${path}`)
                        } catch (e: unknown) {
                          if (e instanceof Error && e.name !== 'AbortError') {
                            toast.error('폴더 선택이 지원되지 않는 브라우저입니다.')
                          }
                        }
                      }}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    운송장 엑셀 파일을 업로드할 때 기본으로 열릴 폴더 경로
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>💡 설정된 폴더는 발송처리 페이지에서 주문 다운로드 및 운송장 업로드 시 기본 경로로 사용됩니다.</p>
              </div>
            </CardContent>
          </Card>

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

              </div>
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <div className="grid items-start gap-4 xl:grid-cols-2">

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

          {aiUsage && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>AI 사용량 (최근 30일)</CardTitle>
                    <CardDescription>OpenAI API 토큰 사용량 및 예상 비용</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">총 토큰</p>
                    <p className="text-xl font-bold">{aiUsage.totalTokens.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">입력 토큰</p>
                    <p className="text-xl font-bold">{aiUsage.totalPromptTokens.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">출력 토큰</p>
                    <p className="text-xl font-bold">{aiUsage.totalCompletionTokens.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground">예상 비용</p>
                    <p className="text-xl font-bold text-primary">{aiUsage.totalCostKrw}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    기능별 사용량
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">벤치마킹 (구조)</span>
                      <span className="font-medium">{aiUsage.usageByType.benchmarking_structure.count}회</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">벤치마킹 (스타일)</span>
                      <span className="font-medium">{aiUsage.usageByType.benchmarking_style.count}회</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">AI 콘텐츠 생성</span>
                      <span className="font-medium">{aiUsage.usageByType.ai_generate.count}회</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">AI 페이지 분석</span>
                      <span className="font-medium">{aiUsage.usageByType.ai_analyze.count}회</span>
                    </div>
                  </div>
                </div>

                {aiUsage.totalTokens === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    아직 AI 기능을 사용하지 않았습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
              </div>
            </TabsContent>

            <TabsContent value="automation" className="mt-0">
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
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <div className="grid items-start gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>SMS / 카카오 알림톡 설정</CardTitle>
                  <CardDescription>공급업체에 발주 알림 발송</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">SMS</span>
                    </div>
                    <Badge variant={notificationStatus.smsConfigured ? 'default' : 'secondary'}>
                      {notificationStatus.smsConfigured ? '설정됨' : '미설정'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    CoolSMS API를 통한 문자 발송
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsNotificationDialogOpen(true)}
                  >
                    설정하기
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">카카오 알림톡</span>
                    </div>
                    <Badge variant={notificationStatus.kakaoConfigured ? 'default' : 'secondary'}>
                      {notificationStatus.kakaoConfigured ? '설정됨' : '미설정'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    카카오 비즈니스 채널 알림톡
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsNotificationDialogOpen(true)}
                  >
                    설정하기
                  </Button>
                </div>
              </div>
              
              {!notificationStatus.smsConfigured && !notificationStatus.kakaoConfigured && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    알림 발송을 위해 SMS 또는 카카오 알림톡을 설정해주세요.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Discord 알림</CardTitle>
                  <CardDescription>주문 동기화 시 Discord로 알림 발송</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Discord 알림 활성화</p>
                  <p className="text-sm text-muted-foreground">
                    신규 주문, 취소 요청 시 Discord로 알림
                  </p>
                </div>
                <Switch
                  checked={discordSettings.enabled}
                  onCheckedChange={(checked) =>
                    setDiscordSettings((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="discordWebhook">웹훅 URL</Label>
                <Input
                  id="discordWebhook"
                  type="url"
                  value={discordSettings.webhookUrl}
                  onChange={(e) =>
                    setDiscordSettings((prev) => ({ ...prev, webhookUrl: e.target.value }))
                  }
                  placeholder="https://discord.com/api/webhooks/..."
                  disabled={!discordSettings.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Discord 서버 설정 &gt; 연동 &gt; 웹후크에서 URL을 복사하세요.
                </p>
              </div>

              {discordSettings.enabled && discordSettings.webhookUrl && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    동기화 시 신규 주문, 취소 요청이 있으면 Discord로 알림이 발송됩니다.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleTestDiscordWebhook}
                  disabled={isPending || !discordSettings.webhookUrl}
                >
                  테스트 발송
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSaveDiscordSettings}
                  disabled={isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  설정 저장
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>앱 알림 설정</CardTitle>
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
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SMS / 카카오 알림톡 설정</DialogTitle>
            <DialogDescription>
              공급업체에 발주 알림을 발송하려면 아래 설정을 완료하세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <h3 className="font-semibold">SMS 설정 (CoolSMS)</h3>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>설정 방법:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>
                      <a href="https://coolsms.co.kr" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                        CoolSMS 사이트 <ExternalLink className="h-3 w-3" />
                      </a>
                      에서 회원가입
                    </li>
                    <li>개발자 콘솔에서 API Key 발급</li>
                    <li>발신번호 등록 (사전 인증 필요)</li>
                    <li>아래에 정보 입력 후 .env.local 파일에 저장</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={notificationApiKeys.coolsmsApiKey}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, coolsmsApiKey: e.target.value }))}
                    placeholder="NCSXXXXXXXXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={notificationApiKeys.coolsmsApiSecret}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, coolsmsApiSecret: e.target.value }))}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>발신번호</Label>
                  <Input
                    value={notificationApiKeys.coolsmsSenderId}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, coolsmsSenderId: e.target.value }))}
                    placeholder="01012345678"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-2">.env.local 파일에 추가할 내용:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`COOLSMS_API_KEY=${notificationApiKeys.coolsmsApiKey || 'your_api_key'}
COOLSMS_API_SECRET=${notificationApiKeys.coolsmsApiSecret || 'your_api_secret'}
COOLSMS_SENDER_ID=${notificationApiKeys.coolsmsSenderId || 'your_phone_number'}`}
                </pre>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">카카오 알림톡 설정 (Solapi)</h3>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>설정 방법:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>
                      <a href="https://solapi.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                        Solapi 사이트 <ExternalLink className="h-3 w-3" />
                      </a>
                      에서 회원가입
                    </li>
                    <li>카카오 비즈니스 채널 연동</li>
                    <li>알림톡 템플릿 등록 및 승인 (1-3일 소요)</li>
                    <li>API Key 발급 후 아래 정보 입력</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={notificationApiKeys.kakaoApiKey}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, kakaoApiKey: e.target.value }))}
                    placeholder="KAKAO_XXXXXXXXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>발신 프로필 ID (pfId)</Label>
                  <Input
                    value={notificationApiKeys.kakaoSenderId}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, kakaoSenderId: e.target.value }))}
                    placeholder="@your_channel_id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>템플릿 ID</Label>
                  <Input
                    value={notificationApiKeys.kakaoTemplateId}
                    onChange={(e) => setNotificationApiKeys(prev => ({ ...prev, kakaoTemplateId: e.target.value }))}
                    placeholder="TXXXXXXXXXX"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-2">.env.local 파일에 추가할 내용:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`KAKAO_ALIMTALK_API_KEY=${notificationApiKeys.kakaoApiKey || 'your_api_key'}
KAKAO_ALIMTALK_SENDER_ID=${notificationApiKeys.kakaoSenderId || 'your_channel_id'}
KAKAO_ALIMTALK_TEMPLATE_ID=${notificationApiKeys.kakaoTemplateId || 'your_template_id'}`}
                </pre>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <p className="text-xs text-muted-foreground flex-1">
              * 환경변수 설정 후 서버 재시작이 필요합니다.
            </p>
            <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
