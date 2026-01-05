'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database.types'

export interface CourierData {
  id: string
  name: string
  code: string
  apiType: string | null
  apiConfig: Json
  isDefault: boolean
  createdAt: string
}

interface CourierRow {
  id: string
  name: string
  code: string
  api_type: string | null
  api_config: Json
  is_default: boolean
  created_at: string
}

export async function getCourierCodes() {
  return [
    { code: 'CJGLS', name: 'CJ대한통운' },
    { code: 'HANJIN', name: '한진택배' },
    { code: 'LOTTE', name: '롯데택배' },
    { code: 'LOGEN', name: '로젠택배' },
    { code: 'EPOST', name: '우체국택배' },
    { code: 'KGB', name: 'KGB택배' },
    { code: 'DAESIN', name: '대신택배' },
    { code: 'ILYANG', name: '일양로지스' },
    { code: 'KDEXP', name: '경동택배' },
    { code: 'CHUNIL', name: '천일택배' },
    { code: 'CUPOST', name: 'CU편의점택배' },
    { code: 'GSPOST', name: 'GS편의점택배' },
  ]
}

export async function getCouriers(): Promise<{ data: CourierData[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: couriers, error } = await supabase
    .from('couriers')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedCouriers = couriers as unknown as CourierRow[]

  return {
    data: typedCouriers.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      apiType: c.api_type,
      apiConfig: c.api_config,
      isDefault: c.is_default,
      createdAt: c.created_at,
    })),
    error: null,
  }
}

interface CreateCourierInput {
  name: string
  code: string
  apiType?: string
  apiConfig?: Json
  isDefault?: boolean
}

export async function createCourier(
  input: CreateCourierInput
): Promise<{ data: CourierData | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  if (input.isDefault) {
    await supabase
      .from('couriers')
      .update({ is_default: false })
      .eq('user_id', userData.user.id)
  }

  const { data, error } = await supabase
    .from('couriers')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      code: input.code,
      api_type: input.apiType || null,
      api_config: input.apiConfig || {},
      is_default: input.isDefault || false,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as CourierRow

  revalidatePath('/suppliers')
  revalidatePath('/settings')

  return {
    data: {
      id: typedData.id,
      name: typedData.name,
      code: typedData.code,
      apiType: typedData.api_type,
      apiConfig: typedData.api_config,
      isDefault: typedData.is_default,
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

interface UpdateCourierInput {
  id: string
  name?: string
  code?: string
  apiType?: string | null
  apiConfig?: Json
  isDefault?: boolean
}

export async function updateCourier(
  input: UpdateCourierInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  if (input.isDefault) {
    await supabase
      .from('couriers')
      .update({ is_default: false })
      .eq('user_id', userData.user.id)
  }

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.code !== undefined) updateData.code = input.code
  if (input.apiType !== undefined) updateData.api_type = input.apiType
  if (input.apiConfig !== undefined) updateData.api_config = input.apiConfig
  if (input.isDefault !== undefined) updateData.is_default = input.isDefault

  const { error } = await supabase
    .from('couriers')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/suppliers')
  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function deleteCourier(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('couriers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/suppliers')
  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function getCouriersSimple(): Promise<{ data: { id: string; name: string; code: string }[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: couriers, error } = await supabase
    .from('couriers')
    .select('id, name, code')
    .eq('user_id', userData.user.id)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: couriers as { id: string; name: string; code: string }[],
    error: null,
  }
}
