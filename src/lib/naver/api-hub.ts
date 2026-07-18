import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { resolveCurrentStoreId } from '@/lib/stores/current-store'

const API_HUB_BASE = 'https://naverapihub.apigw.ntruss.com'

interface ApiHubConfig {
  naverApiHubClientId?: string
  naverApiHubClientSecret?: string
}

export async function getCurrentApiHubConfig(): Promise<{
  config: ApiHubConfig | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { config: null, error: '로그인이 필요합니다.' }

  const storeId = await resolveCurrentStoreId(supabase, user.id)
  if (!storeId) return { config: null, error: '스토어 설정을 먼저 완료해주세요.' }

  const { data: store, error } = await supabase
    .from('stores')
    .select('api_config')
    .eq('id', storeId)
    .maybeSingle()

  if (error || !store) return { config: null, error: error?.message || '스토어를 찾을 수 없습니다.' }
  const config = (store.api_config || {}) as ApiHubConfig
  if (!config.naverApiHubClientId || !config.naverApiHubClientSecret) {
    return { config: null, error: '설정에서 NAVER API HUB 키를 입력해주세요.' }
  }
  return { config, error: null }
}

export async function apiHubPost(path: string, body: Record<string, unknown>) {
  const { config, error } = await getCurrentApiHubConfig()
  if (!config) throw new Error(error || 'NAVER API HUB 설정이 필요합니다.')

  const response = await fetch(`${API_HUB_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': config.naverApiHubClientId!,
      'X-NCP-APIGW-API-KEY': config.naverApiHubClientSecret!,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error?.message || data?.errorMessage || data?.errMsg
    throw new Error(message || `NAVER API HUB 요청이 거절되었습니다. (${response.status})`)
  }
  return data
}
