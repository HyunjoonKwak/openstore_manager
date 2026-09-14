'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { validateInput, idSchema } from '@/lib/validation'
import { z } from 'zod'
import type { MarketPlatformDb, SyncRunRow, SyncScheduleRow } from '@/types/redesign.types'

// Schedules are per market account. Execution is driven by an external
// cron hitting /api/cron/sync, which evaluates due-ness; these actions
// only own the definitions and the run history.

export type SyncType = 'orders' | 'products' | 'both'

export interface SyncScheduleView {
  id: string
  marketAccountId: string
  marketAccountName: string
  platform: MarketPlatformDb
  syncType: SyncType
  intervalMinutes: number
  syncTime: string | null
  isEnabled: boolean
  lastSyncAt: string | null
}

export type SyncRunTrigger = 'scheduled' | 'manual'

export interface SyncRunView {
  id: string
  marketAccountName: string
  // 'scheduled' when the cron route stamped a schedule id, 'manual' otherwise
  trigger: SyncRunTrigger
  scheduleId: string | null
  syncType: string
  status: string
  itemsProcessed: number
  itemsFailed: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

const upsertScheduleSchema = z.object({
  marketAccountId: idSchema,
  syncType: z.enum(['orders', 'products', 'both']),
  intervalMinutes: z.number().int().min(5).max(10080),
  syncTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  isEnabled: z.boolean().optional(),
})

export async function getSyncSchedules(): Promise<{
  data: SyncScheduleView[] | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('sync_schedules')
    .select('*, market_accounts (name, platform)')
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }

  const rows = (data || []) as unknown as Array<
    SyncScheduleRow & { market_accounts: { name: string; platform: MarketPlatformDb } | null }
  >

  return {
    data: rows.map((row) => ({
      id: row.id,
      marketAccountId: row.market_account_id,
      marketAccountName: row.market_accounts?.name || '(삭제된 계정)',
      platform: row.market_accounts?.platform || 'naver',
      syncType: row.sync_type as SyncType,
      intervalMinutes: row.interval_minutes,
      syncTime: row.sync_time,
      isEnabled: row.is_enabled,
      lastSyncAt: row.last_sync_at,
    })),
    error: null,
  }
}

export async function upsertSyncSchedule(input: {
  marketAccountId: string
  syncType: SyncType
  intervalMinutes: number
  syncTime?: string | null
  isEnabled?: boolean
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  let userId: string
  try {
    userId = (await requireUser(supabase)).id
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(upsertScheduleSchema, input)
  if (validation.error !== null) return { success: false, error: validation.error }
  const parsed = validation.data

  const patch = {
    sync_type: parsed.syncType,
    interval_minutes: parsed.intervalMinutes,
    // Wall-clock time only applies to daily schedules
    sync_time: parsed.intervalMinutes >= 1440 ? parsed.syncTime || '09:00' : null,
    is_enabled: parsed.isEnabled ?? true,
  }

  // One schedule per account keeps the UI (and due evaluation) simple
  const { data: existing } = await supabase
    .from('sync_schedules')
    .select('id')
    .eq('market_account_id', parsed.marketAccountId)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from('sync_schedules').update(patch).eq('id', existing.id)
    : await supabase.from('sync_schedules').insert({
        user_id: userId,
        market_account_id: parsed.marketAccountId,
        ...patch,
      })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function toggleSyncSchedule(
  scheduleId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('sync_schedules')
    .update({ is_enabled: isEnabled })
    .eq('id', scheduleId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function deleteSyncSchedule(
  scheduleId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase.from('sync_schedules').delete().eq('id', scheduleId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function getSyncRuns(limit: number = 20): Promise<{
  data: SyncRunView[] | null
  error: string | null
}> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('sync_runs')
    .select('*, market_accounts (name)')
    .order('started_at', { ascending: false })
    .limit(Math.min(limit, 100))

  if (error) return { data: null, error: error.message }

  const rows = (data || []) as unknown as Array<
    SyncRunRow & { market_accounts: { name: string } | null }
  >

  return {
    data: rows.map((row) => ({
      id: row.id,
      marketAccountName: row.market_accounts?.name || '(삭제된 계정)',
      trigger: row.schedule_id ? 'scheduled' : 'manual',
      scheduleId: row.schedule_id,
      syncType: row.sync_type,
      status: row.status,
      itemsProcessed: row.items_processed,
      itemsFailed: row.items_failed,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
    error: null,
  }
}
