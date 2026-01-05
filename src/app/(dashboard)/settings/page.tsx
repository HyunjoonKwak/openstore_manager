'use client'

import { useState, useEffect, useTransition } from 'react'
import { Save, LogOut, User, Key, Bell, Loader2, CheckCircle, RefreshCw, Clock, MessageSquare, ExternalLink, AlertCircle, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
    checkNotificationStatus()
  }, [])

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
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>SMS / 카카오 알림톡 설정</CardTitle>
                  <CardDescription>공급업체에 발주 알림 발송</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
