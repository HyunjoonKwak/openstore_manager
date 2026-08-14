import 'server-only'

import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { decryptApiConfigSecrets } from '@/lib/secret-crypto'
import { createAdapter, type MarketApiConfig } from './registry'
import type { MarketAdapter } from './types'
import type { MarketAccountRow } from '@/types/redesign.types'

export interface ResolvedMarketAccount {
  account: MarketAccountRow
  adapter: MarketAdapter
}

/**
 * Load a market account owned by the current user and build its adapter.
 * Replaces the old current-store cookie resolution: callers name the
 * account explicitly instead of relying on ambient state.
 */
export async function resolveMarketAccount(
  marketAccountId: string
): Promise<{ resolved: ResolvedMarketAccount | null; error: string | null }> {
  const supabase = await createRedesignClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { resolved: null, error: '로그인이 필요합니다.' }

  const { data, error } = await supabase
    .from('market_accounts')
    .select('*')
    .eq('id', marketAccountId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) return { resolved: null, error: error.message }
  const account = data as unknown as MarketAccountRow | null
  if (!account) return { resolved: null, error: '마켓 계정을 찾을 수 없습니다.' }

  let config: MarketApiConfig
  try {
    config = decryptApiConfigSecrets((account.api_config || {}) as MarketApiConfig)
  } catch (decryptError) {
    console.error('Failed to decrypt market credentials:', decryptError)
    return {
      resolved: null,
      error: '저장된 API 키를 복호화할 수 없습니다. 서버 암호화 키 설정을 확인해주세요.',
    }
  }

  const { adapter, error: adapterError } = createAdapter(account.platform, config)
  if (!adapter) return { resolved: null, error: adapterError }

  return { resolved: { account, adapter }, error: null }
}

/** Load every active market account of the current user with adapters. */
export async function resolveActiveMarketAccounts(): Promise<{
  resolved: ResolvedMarketAccount[]
  errors: Array<{ accountId: string; accountName: string; error: string }>
}> {
  const supabase = await createRedesignClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { resolved: [], errors: [] }

  const { data: accountsData } = await supabase
    .from('market_accounts')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const accounts = (accountsData || []) as unknown as MarketAccountRow[]
  const resolved: ResolvedMarketAccount[] = []
  const errors: Array<{ accountId: string; accountName: string; error: string }> = []

  for (const account of accounts) {
    let config: MarketApiConfig
    try {
      config = decryptApiConfigSecrets((account.api_config || {}) as MarketApiConfig)
    } catch {
      errors.push({ accountId: account.id, accountName: account.name, error: '자격증명 복호화 실패' })
      continue
    }
    const { adapter, error } = createAdapter(account.platform, config)
    if (!adapter) {
      errors.push({ accountId: account.id, accountName: account.name, error: error || '어댑터 생성 실패' })
      continue
    }
    resolved.push({ account, adapter })
  }

  return { resolved, errors }
}
