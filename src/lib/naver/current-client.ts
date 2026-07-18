import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { resolveCurrentStoreId } from '@/lib/stores/current-store'
import { NaverCommerceClient } from '@/lib/naver/client'

interface NaverApiConfig {
  naverClientId?: string
  naverClientSecret?: string
  naverSellerId?: string
}

export function formatCommerceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('auth.eapp-application.status.invalid') || message.includes('어플리케이션 상태')) {
    return '네이버 커머스 API 앱이 현재 사용 가능한 상태가 아닙니다. 커머스 API 센터에서 앱 상태를 확인해주세요.'
  }
  if (message.includes('Failed to get access token')) {
    return '네이버 커머스 API 인증에 실패했습니다. 설정에서 Client ID와 Client Secret을 확인해주세요.'
  }
  return message || fallback
}

export async function getCurrentNaverClient(): Promise<{
  client: NaverCommerceClient | null
  configured: boolean
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { client: null, configured: false, error: '로그인이 필요합니다.' }

  const storeId = await resolveCurrentStoreId(supabase, user.id)
  if (!storeId) return { client: null, configured: false, error: '스토어 설정을 먼저 완료해주세요.' }

  const { data: store, error } = await supabase
    .from('stores')
    .select('api_config')
    .eq('id', storeId)
    .maybeSingle()

  if (error || !store) {
    return { client: null, configured: false, error: error?.message || '스토어를 찾을 수 없습니다.' }
  }

  const config = (store.api_config || {}) as NaverApiConfig
  if (!config.naverClientId || !config.naverClientSecret) {
    return { client: null, configured: false, error: '설정에서 네이버 커머스 API 키를 입력해주세요.' }
  }

  return {
    client: new NaverCommerceClient({
      clientId: config.naverClientId,
      clientSecret: config.naverClientSecret,
      sellerId: config.naverSellerId,
    }),
    configured: true,
    error: null,
  }
}
