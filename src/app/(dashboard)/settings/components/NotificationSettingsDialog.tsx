'use client'

import { useState } from 'react'
import { MessageSquare, ExternalLink, AlertCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

interface NotificationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationSettingsDialog({ open, onOpenChange }: NotificationSettingsDialogProps) {
  const [notificationApiKeys, setNotificationApiKeys] = useState({
    coolsmsApiKey: '',
    coolsmsApiSecret: '',
    coolsmsSenderId: '',
    kakaoApiKey: '',
    kakaoSenderId: '',
    kakaoTemplateId: '',
  })

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>SMS / 카카오 알림톡 설정</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            공급업체에 발주 알림을 발송하려면 아래 설정을 완료하세요.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
COOLSMS_API_SECRET=${notificationApiKeys.coolsmsApiSecret ? '********' : 'your_api_secret'}
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
{`KAKAO_ALIMTALK_API_KEY=${notificationApiKeys.kakaoApiKey ? '********' : 'your_api_key'}
KAKAO_ALIMTALK_SENDER_ID=${notificationApiKeys.kakaoSenderId || 'your_channel_id'}
KAKAO_ALIMTALK_TEMPLATE_ID=${notificationApiKeys.kakaoTemplateId || 'your_template_id'}`}
              </pre>
            </div>
          </div>
        </div>

        <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            * 환경변수 설정 후 서버 재시작이 필요합니다.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
