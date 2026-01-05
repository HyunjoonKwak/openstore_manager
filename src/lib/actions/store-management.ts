'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Platform, Json } from '@/types/database.types'

export interface StoreInfo {
  id: string
  storeName: string
  platform: Platform
  apiConfig: {
    naverClientId?: string
    naverClientSecret?: string
    openaiApiKey?: string
  }
  createdAt: string
}

export interface SyncStatus {
  lastSyncAt: string | null
  nextSyncAt: string | null
  syncType: string
  isEnabled: boolean
}

interface StoreRow {
  id: string
  store_name: string
  platform: string
  api_config: Json
  created_at: string
}

interface ApiConfigJson {
  naverClientId?: string
  naverClientSecret?: string
  openaiApiKey?: string
}

export async function getStores(): Promise<{ data: StoreInfo[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedStores = stores as unknown as StoreRow[]

  return {
    data: typedStores.map(store => {
      const apiConfig = (store.api_config || {}) as ApiConfigJson
      return {
        id: store.id,
        storeName: store.store_name,
        platform: store.platform as Platform,
        apiConfig: {
          naverClientId: apiConfig.naverClientId || '',
          naverClientSecret: apiConfig.naverClientSecret || '',
          openaiApiKey: apiConfig.openaiApiKey || '',
        },
        createdAt: store.created_at,
      }
    }),
    error: null,
  }
}

export async function getCurrentStoreId(): Promise<string | null> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return null
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .single()

  return store?.id || null
}

interface CreateStoreInput {
  storeName: string
  platform: Platform
  naverClientId?: string
  naverClientSecret?: string
  openaiApiKey?: string
}

export async function createStore(input: CreateStoreInput): Promise<{ data: StoreInfo | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const apiConfig: Record<string, string> = {}
  if (input.naverClientId) apiConfig.naverClientId = input.naverClientId
  if (input.naverClientSecret) apiConfig.naverClientSecret = input.naverClientSecret
  if (input.openaiApiKey) apiConfig.openaiApiKey = input.openaiApiKey

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      user_id: userData.user.id,
      store_name: input.storeName,
      platform: input.platform,
      api_config: apiConfig,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedStore = store as unknown as StoreRow
  const config = (typedStore.api_config || {}) as ApiConfigJson

  revalidatePath('/settings')
  revalidatePath('/inventory')
  revalidatePath('/orders')

  return {
    data: {
      id: typedStore.id,
      storeName: typedStore.store_name,
      platform: typedStore.platform as Platform,
      apiConfig: {
        naverClientId: config.naverClientId || '',
        naverClientSecret: config.naverClientSecret || '',
        openaiApiKey: config.openaiApiKey || '',
      },
      createdAt: typedStore.created_at,
    },
    error: null,
  }
}

export async function updateStore(
  storeId: string,
  input: Partial<CreateStoreInput>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const updateData: Record<string, unknown> = {}
  if (input.storeName) updateData.store_name = input.storeName
  if (input.platform) updateData.platform = input.platform

  if (input.naverClientId || input.naverClientSecret || input.openaiApiKey) {
    const { data: existingStore } = await supabase
      .from('stores')
      .select('api_config')
      .eq('id', storeId)
      .single()

    const existingConfig = (existingStore?.api_config || {}) as ApiConfigJson
    const newConfig: Record<string, string> = { ...existingConfig }
    
    if (input.naverClientId !== undefined) newConfig.naverClientId = input.naverClientId
    if (input.naverClientSecret !== undefined) newConfig.naverClientSecret = input.naverClientSecret
    if (input.openaiApiKey !== undefined) newConfig.openaiApiKey = input.openaiApiKey
    
    updateData.api_config = newConfig
  }

  const { error } = await supabase
    .from('stores')
    .update(updateData)
    .eq('id', storeId)
    .eq('user_id', userData.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function deleteStore(storeId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact' })
    .eq('user_id', userData.user.id)

  if (storeCount && storeCount.length <= 1) {
    return { success: false, error: '최소 1개의 스토어가 필요합니다.' }
  }

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('user_id', userData.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/inventory')
  revalidatePath('/orders')

  return { success: true, error: null }
}

export async function getStoreSyncStatus(storeId: string): Promise<{ data: SyncStatus | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: schedule, error } = await supabase
    .from('sync_schedules')
    .select('last_sync_at, interval_minutes, is_enabled, sync_type')
    .eq('store_id', storeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: { lastSyncAt: null, nextSyncAt: null, syncType: 'orders', isEnabled: false }, error: null }
    }
    return { data: null, error: error.message }
  }

  interface ScheduleRow {
    last_sync_at: string | null
    interval_minutes: number
    is_enabled: boolean
    sync_type: string
  }

  const typedSchedule = schedule as unknown as ScheduleRow
  
  let nextSyncAt: string | null = null
  if (typedSchedule.last_sync_at && typedSchedule.is_enabled) {
    const lastSync = new Date(typedSchedule.last_sync_at)
    const nextSync = new Date(lastSync.getTime() + typedSchedule.interval_minutes * 60 * 1000)
    nextSyncAt = nextSync.toISOString()
  }

  return {
    data: {
      lastSyncAt: typedSchedule.last_sync_at,
      nextSyncAt,
      syncType: typedSchedule.sync_type,
      isEnabled: typedSchedule.is_enabled,
    },
    error: null,
  }
}

export async function copyProductToStore(
  productId: string,
  targetStoreId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: targetStore } = await supabase
    .from('stores')
    .select('id')
    .eq('id', targetStoreId)
    .eq('user_id', userData.user.id)
    .single()

  if (!targetStore) {
    return { success: false, error: '대상 스토어를 찾을 수 없습니다.' }
  }

  interface ProductRow {
    id: string
    name: string
    price: number
    stock_quantity: number
    sku: string | null
    category: string | null
    brand: string | null
    image_url: string | null
    status: string
    supplier_id: string | null
  }

  const { data: sourceProduct, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (fetchError || !sourceProduct) {
    return { success: false, error: '원본 상품을 찾을 수 없습니다.' }
  }

  const product = sourceProduct as unknown as ProductRow

  const { error: insertError } = await supabase
    .from('products')
    .insert({
      store_id: targetStoreId,
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity,
      sku: product.sku ? `${product.sku}_copy` : null,
      category: product.category,
      brand: product.brand,
      image_url: product.image_url,
      status: 'draft',
      supplier_id: product.supplier_id,
    })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/inventory')
  return { success: true, error: null }
}

export async function copyProductsToStore(
  productIds: string[],
  targetStoreId: string
): Promise<{ success: boolean; copiedCount: number; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, copiedCount: 0, error: 'Unauthorized' }
  }

  const { data: targetStore } = await supabase
    .from('stores')
    .select('id')
    .eq('id', targetStoreId)
    .eq('user_id', userData.user.id)
    .single()

  if (!targetStore) {
    return { success: false, copiedCount: 0, error: '대상 스토어를 찾을 수 없습니다.' }
  }

  interface ProductRow {
    id: string
    name: string
    price: number
    stock_quantity: number
    sku: string | null
    category: string | null
    brand: string | null
    image_url: string | null
    status: string
    supplier_id: string | null
  }

  const { data: sourceProducts, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds)

  if (fetchError || !sourceProducts || sourceProducts.length === 0) {
    return { success: false, copiedCount: 0, error: '원본 상품을 찾을 수 없습니다.' }
  }

  const products = sourceProducts as unknown as ProductRow[]

  const insertData = products.map(product => ({
    store_id: targetStoreId,
    name: product.name,
    price: product.price,
    stock_quantity: product.stock_quantity,
    sku: product.sku ? `${product.sku}_copy` : null,
    category: product.category,
    brand: product.brand,
    image_url: product.image_url,
    status: 'draft',
    supplier_id: product.supplier_id,
  }))

  const { error: insertError } = await supabase
    .from('products')
    .insert(insertData)

  if (insertError) {
    return { success: false, copiedCount: 0, error: insertError.message }
  }

  revalidatePath('/inventory')
  return { success: true, copiedCount: products.length, error: null }
}
