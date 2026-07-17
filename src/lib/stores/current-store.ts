import 'server-only'

import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export const CURRENT_STORE_COOKIE = 'current_store_id'

export async function resolveCurrentStoreId(
  supabase: SupabaseClient,
  userId: string,
  requestedStoreId?: string | null
): Promise<string | null> {
  const cookieStore = await cookies()
  const candidateId = requestedStoreId || cookieStore.get(CURRENT_STORE_COOKIE)?.value

  if (candidateId) {
    const { data: ownedStore } = await supabase
      .from('stores')
      .select('id')
      .eq('id', candidateId)
      .eq('user_id', userId)
      .maybeSingle()

    if (ownedStore) return ownedStore.id
  }

  const { data: firstStore } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return firstStore?.id || null
}
