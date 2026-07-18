import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { resolveCurrentStoreId } from '@/lib/stores/current-store'
import { NaverCommerceClient } from '@/lib/naver/client'

interface NaverApiConfig {
  naverClientId?: string
  naverClientSecret?: string
  naverSellerId?: string
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
