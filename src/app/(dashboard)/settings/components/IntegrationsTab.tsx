'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Key, Loader2, CheckCircle, Zap, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { UsageSummary } from '@/lib/actions/ai-usage'
import { ApiStatusBadge, type ApiConnectionState } from './ApiStatusBadge'

export interface ApiKeysState {
  naverClientId: string
  naverClientSecret: string
  naverApiHubClientId: string
  naverApiHubClientSecret: string
  openaiApiKey: string
}

export interface ApiConfiguredState {
  naverCommerce: boolean
  naverApiHub: boolean
  openai: boolean
}

export interface ApiConnectionStateMap {
  naverCommerce: ApiConnectionState
  naverApiHub: ApiConnectionState
  openai: ApiConnectionState
}

interface IntegrationsTabProps {
  apiKeys: ApiKeysState
  setApiKeys: Dispatch<SetStateAction<ApiKeysState>>
  apiConfigured: ApiConfiguredState
  editingApi: ApiConfiguredState
  setEditingApi: Dispatch<SetStateAction<ApiConfiguredState>>
  apiConnectionState: ApiConnectionStateMap
  isTesting: boolean
  isTestingApiHub: boolean
  isTestingOpenAI: boolean
  handleTestConnection: () => void
  handleTestApiHub: () => void
  handleTestOpenAI: () => void
  aiUsage: UsageSummary | null
}

export function IntegrationsTab({
  apiKeys,
  setApiKeys,
  apiConfigured,
  editingApi,
  setEditingApi,
  apiConnectionState,
  isTesting,
  isTestingApiHub,
  isTestingOpenAI,
  handleTestConnection,
  handleTestApiHub,
  handleTestOpenAI,
  aiUsage,
}: IntegrationsTabProps) {
  return (
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
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">네이버 커머스 API</h4>
                  <ApiStatusBadge configured={apiConfigured.naverCommerce} state={apiConnectionState.naverCommerce} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">상품·주문·정산 관리와 스마트스토어 게시에 사용됩니다.</p>
              </div>
              <div className="flex gap-2">
                {apiConfigured.naverCommerce && !editingApi.naverCommerce && (
                  <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    연결 테스트
                  </Button>
                )}
                {apiConfigured.naverCommerce && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingApi((prev) => ({ ...prev, naverCommerce: !prev.naverCommerce }))
                      setApiKeys((prev) => ({ ...prev, naverClientId: '', naverClientSecret: '' }))
                    }}
                  >
                    {editingApi.naverCommerce ? '입력 취소' : '새 키로 교체'}
                  </Button>
                )}
              </div>
            </div>
            {apiConfigured.naverCommerce && !editingApi.naverCommerce ? (
              <div className="flex gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p><span className="font-medium">자격증명이 안전하게 저장되어 있습니다.</span><br /><span className="text-xs text-muted-foreground">보안을 위해 저장된 값은 다시 표시하지 않습니다.</span></p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="naverClientId">Client ID</Label>
                  <Input id="naverClientId" value={apiKeys.naverClientId} onChange={(e) => setApiKeys((prev) => ({ ...prev, naverClientId: e.target.value }))} placeholder="애플리케이션 Client ID" autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naverClientSecret">Client Secret</Label>
                  <Input id="naverClientSecret" type="password" value={apiKeys.naverClientSecret} onChange={(e) => setApiKeys((prev) => ({ ...prev, naverClientSecret: e.target.value }))} placeholder="새 Client Secret" autoComplete="new-password" />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">입력 후 상단의 ‘기본 정보 · API 저장’을 눌러 적용하세요.</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">NAVER API HUB</h4>
                  <ApiStatusBadge configured={apiConfigured.naverApiHub} state={apiConnectionState.naverApiHub} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">검색어 트렌드와 쇼핑 인사이트 전용 키입니다.</p>
              </div>
              <div className="flex gap-2">
                {apiConfigured.naverApiHub && !editingApi.naverApiHub && (
                  <Button variant="outline" size="sm" onClick={handleTestApiHub} disabled={isTestingApiHub}>
                    {isTestingApiHub ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    연결 테스트
                  </Button>
                )}
                {apiConfigured.naverApiHub && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingApi((prev) => ({ ...prev, naverApiHub: !prev.naverApiHub }))
                      setApiKeys((prev) => ({ ...prev, naverApiHubClientId: '', naverApiHubClientSecret: '' }))
                    }}
                  >
                    {editingApi.naverApiHub ? '입력 취소' : '새 키로 교체'}
                  </Button>
                )}
              </div>
            </div>
            {apiConfigured.naverApiHub && !editingApi.naverApiHub ? (
              <div className="flex gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p><span className="font-medium">트렌드 API 자격증명이 저장되어 있습니다.</span><br /><span className="text-xs text-muted-foreground">저장된 값은 보안상 다시 표시하지 않습니다.</span></p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="naverApiHubClientId">Client ID</Label>
                  <Input id="naverApiHubClientId" value={apiKeys.naverApiHubClientId} onChange={(e) => setApiKeys((prev) => ({ ...prev, naverApiHubClientId: e.target.value }))} placeholder="NAVER Cloud Application Client ID" autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naverApiHubClientSecret">Client Secret</Label>
                  <Input id="naverApiHubClientSecret" type="password" value={apiKeys.naverApiHubClientSecret} onChange={(e) => setApiKeys((prev) => ({ ...prev, naverApiHubClientSecret: e.target.value }))} placeholder="새 Client Secret" autoComplete="new-password" />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">커머스 API와 별도 발급된 값을 입력하세요.</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">OpenAI API</h4>
                  <ApiStatusBadge configured={apiConfigured.openai} state={apiConnectionState.openai} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">경쟁 상품 분석과 AI 상세페이지 생성에 사용됩니다.</p>
              </div>
              <div className="flex gap-2">
                {apiConfigured.openai && !editingApi.openai && (
                  <Button variant="outline" size="sm" onClick={handleTestOpenAI} disabled={isTestingOpenAI}>
                    {isTestingOpenAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    연결 테스트
                  </Button>
                )}
                {apiConfigured.openai && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingApi((prev) => ({ ...prev, openai: !prev.openai }))
                      setApiKeys((prev) => ({ ...prev, openaiApiKey: '' }))
                    }}
                  >
                    {editingApi.openai ? '입력 취소' : '새 키로 교체'}
                  </Button>
                )}
              </div>
            </div>
            {apiConfigured.openai && !editingApi.openai ? (
              <div className="flex gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p><span className="font-medium">AI API 키가 안전하게 저장되어 있습니다.</span><br /><span className="text-xs text-muted-foreground">필요할 때만 새 키로 교체할 수 있습니다.</span></p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="openaiKey">API 키</Label>
                <Input id="openaiKey" type="password" value={apiKeys.openaiApiKey} onChange={(e) => setApiKeys((prev) => ({ ...prev, openaiApiKey: e.target.value }))} placeholder="sk-••••••••••••••••" autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">입력 후 상단 저장 버튼을 눌러 적용하세요.</p>
              </div>
            )}
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
  )
}
