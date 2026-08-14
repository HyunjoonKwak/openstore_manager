'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { encryptApiConfigSecrets } from '@/lib/secret-crypto'
import { resolveMarketAccount } from '@/lib/markets/resolve'
import { validateInput } from '@/lib/validation'
import {
  createMarketAccountSchema,
  updateMarketAccountSchema,
} from '@/lib/validation-redesign'
import type { MarketPlatformDb } from '@/types/redesign.types'

export interface MarketAccountInfo {
  id: string
  platform: MarketPlatformDb
  name: string
  isActive: boolean
  notificationEnabled: boolean
  /** Which credential fields are present (values never leave the server) */
  configuredKeys: string[]
  createdAt: string
}

export async function getMarketAccounts(): Promise<{
  data: MarketAccountInfo[] | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('market_accounts')
    .select('id, platform, name, is_active, notification_enabled, api_config, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }

  return {
    data: (data || []).map((row) => ({
      id: row.id as string,
      platform: row.platform as MarketPlatformDb,
      name: row.name as string,
      isActive: Boolean(row.is_active),
      notificationEnabled: Boolean(row.notification_enabled),
      configuredKeys: Object.entries((row.api_config || {}) as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([key]) => key),
      createdAt: row.created_at as string,
    })),
    error: null,
  }
}

export async function createMarketAccount(input: {
  platform: MarketPlatformDb
  name: string
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(createMarketAccountSchema, input)
  if (validation.error !== null) return { data: null, error: validation.error }

  const { data, error } = await supabase
    .from('market_accounts')
    .insert({
      user_id: userId,
      platform: validation.data.platform,
      name: validation.data.name,
    })
    .select('id')
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/settings')
  return { data: { id: data.id as string }, error: null }
}

export async function updateMarketAccount(input: {
  id: string
  name?: string
  isActive?: boolean
  notificationWebhookUrl?: string | null
  notificationEnabled?: boolean
  apiConfig?: Record<string, unknown>
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(updateMarketAccountSchema, input)
  if (validation.error !== null) return { success: false, error: validation.error }
  const parsed = validation.data

  const patch: Record<string, unknown> = {}
  if (parsed.name !== undefined) patch.name = parsed.name
  if (parsed.isActive !== undefined) patch.is_active = parsed.isActive
  if (parsed.notificationWebhookUrl !== undefined) {
    patch.notification_webhook_url = parsed.notificationWebhookUrl
  }
  if (parsed.notificationEnabled !== undefined) {
    patch.notification_enabled = parsed.notificationEnabled
  }

  if (parsed.apiConfig !== undefined) {
    // Merge over the stored config so partial credential updates keep
    // untouched keys; encrypt secret fields at rest
    const { data: current } = await supabase
      .from('market_accounts')
      .select('api_config')
      .eq('id', parsed.id)
      .maybeSingle()

    const merged = {
      ...((current?.api_config || {}) as Record<string, unknown>),
      ...parsed.apiConfig,
    }
    patch.api_config = encryptApiConfigSecrets(merged)
  }

  if (Object.keys(patch).length === 0) return { success: true, error: null }

  // RLS scopes the update to the owner
  const { error } = await supabase.from('market_accounts').update(patch).eq('id', parsed.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function deleteMarketAccount(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase.from('market_accounts').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function testMarketConnection(
  marketAccountId: string
): Promise<{ ok: boolean; error: string | null }> {
  const { resolved, error } = await resolveMarketAccount(marketAccountId)
  if (!resolved) return { ok: false, error }
  return resolved.adapter.testConnection()
}
