'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Save, Bell, CheckCircle, MessageSquare, AlertCircle, Phone, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

export interface NotificationStatusState {
  smsConfigured: boolean
  kakaoConfigured: boolean
}

export interface DiscordSettingsState {
  webhookUrl: string
  enabled: boolean
}

export interface NotificationsState {
  newOrders: boolean
  orderStatus: boolean
  aiComplete: boolean
}

interface NotificationsTabProps {
  notificationStatus: NotificationStatusState
  setIsNotificationDialogOpen: (open: boolean) => void
  discordSettings: DiscordSettingsState
  setDiscordSettings: Dispatch<SetStateAction<DiscordSettingsState>>
  notifications: NotificationsState
  setNotifications: Dispatch<SetStateAction<NotificationsState>>
  handleTestDiscordWebhook: () => void
  handleSaveDiscordSettings: () => void
  isPending: boolean
}

export function NotificationsTab({
  notificationStatus,
  setIsNotificationDialogOpen,
  discordSettings,
  setDiscordSettings,
  notifications,
  setNotifications,
  handleTestDiscordWebhook,
  handleSaveDiscordSettings,
  isPending,
}: NotificationsTabProps) {
  return (
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
  )
}
