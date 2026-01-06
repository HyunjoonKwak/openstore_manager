'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Platform, Json } from '@/types/database.types'

export interface UserProfile {
  id: string
  email: string
  role: string
}

export interface StoreProfile {
  id: string
  storeName: string
  platform: Platform
  apiConfig: {
    naverClientId?: string
    naverClientSecret?: string
    openaiApiKey?: string
  }
  deliveryCheckSettings?: {
    times: number[]
    enabled: boolean
  }
  notificationSettings?: {
    webhookUrl: string
    enabled: boolean
  }
}

interface StoreRow {
  id: string
  store_name: string
  platform: string
  api_config: Json
  notification_webhook_url?: string | null
  notification_enabled?: boolean | null
}

interface ApiConfigJson {
  naverClientId?: string
  naverClientSecret?: string
  openaiApiKey?: string
  deliveryCheckTimes?: number[] // 배송확인 시간 (KST 시간, 예: [9, 15, 21])
  deliveryCheckEnabled?: boolean
}

export async function getUserProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  return {
    data: {
      id: userData.user.id,
      email: userData.user.email || '',
      role: 'owner',
    },
    error: null,
  }
}

export async function getStoreProfile(): Promise<{ data: StoreProfile | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userData.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { data: null, error: error.message }
  }

  const typedStore = store as unknown as StoreRow
  const apiConfig = (typedStore.api_config || {}) as ApiConfigJson

  return {
    data: {
      id: typedStore.id,
      storeName: typedStore.store_name,
      platform: typedStore.platform as Platform,
      apiConfig: {
        naverClientId: apiConfig.naverClientId || '',
        naverClientSecret: apiConfig.naverClientSecret || '',
        openaiApiKey: apiConfig.openaiApiKey || '',
      },
      deliveryCheckSettings: {
        times: apiConfig.deliveryCheckTimes || [9, 15, 21],
        enabled: apiConfig.deliveryCheckEnabled ?? true,
      },
      notificationSettings: {
        webhookUrl: typedStore.notification_webhook_url || '',
        enabled: typedStore.notification_enabled ?? false,
      },
    },
    error: null,
  }
}

interface CreateOrUpdateStoreInput {
  storeName: string
  platform: Platform
  naverClientId?: string
  naverClientSecret?: string
  openaiApiKey?: string
}

export async function createOrUpdateStore(
  input: CreateOrUpdateStoreInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  const apiConfig: Record<string, string> = {}
  if (input.naverClientId) apiConfig.naverClientId = input.naverClientId
  if (input.naverClientSecret) apiConfig.naverClientSecret = input.naverClientSecret
  if (input.openaiApiKey) apiConfig.openaiApiKey = input.openaiApiKey

  if (existingStore) {
    const { error } = await supabase
      .from('stores')
      .update({
        store_name: input.storeName,
        platform: input.platform,
        api_config: apiConfig,
      })
      .eq('id', existingStore.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase.from('stores').insert({
      user_id: userData.user.id,
      store_name: input.storeName,
      platform: input.platform,
      api_config: apiConfig,
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/inventory')
  return { success: true, error: null }
}

export interface DeliveryCheckSettingsInput {
  times: number[]
  enabled: boolean
}

export async function updateDeliveryCheckSettings(
  input: DeliveryCheckSettingsInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: existingStore } = await supabase
    .from('stores')
    .select('id, api_config')
    .eq('user_id', userData.user.id)
    .single()

  if (!existingStore) {
    return { success: false, error: '스토어를 먼저 생성해주세요.' }
  }

  const currentConfig = (existingStore.api_config || {}) as ApiConfigJson
  const updatedConfig = {
    ...currentConfig,
    deliveryCheckTimes: input.times,
    deliveryCheckEnabled: input.enabled,
  }

  const { error } = await supabase
    .from('stores')
    .update({ api_config: updatedConfig })
    .eq('id', existingStore.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export interface NotificationSettingsInput {
  webhookUrl: string
  enabled: boolean
}

export async function updateNotificationSettings(
  input: NotificationSettingsInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (!existingStore) {
    return { success: false, error: '스토어를 먼저 생성해주세요.' }
  }

  const { error } = await supabase
    .from('stores')
    .update({
      notification_webhook_url: input.webhookUrl || null,
      notification_enabled: input.enabled,
    })
    .eq('id', existingStore.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true, error: null }
}
