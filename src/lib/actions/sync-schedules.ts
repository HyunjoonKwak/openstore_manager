'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SyncType as SyncTypeDB } from '@/types/database.types'

export type SyncType = SyncTypeDB

export interface SyncSchedule {
  id: string
  storeId: string
  syncType: SyncType
  intervalMinutes: number
  isEnabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  syncAtMinute: 0 | 30
  syncTime: string | null
  createdAt: string
}

export interface SyncLog {
  id: string
  scheduleId: string
  syncType: string
  status: 'success' | 'failed' | 'running'
  itemsSynced: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

interface SyncScheduleRow {
  id: string
  store_id: string
  sync_type: string
  interval_minutes: number
  is_enabled: boolean
  last_sync_at: string | null
  next_sync_at: string | null
  sync_at_minute: number | null
  sync_time: string | null
  created_at: string
}

interface SyncLogRow {
  id: string
  schedule_id: string
  sync_type: string
  status: string
  items_synced: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export async function getSyncSchedules(): Promise<{
  data: SyncSchedule[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: schedules, error } = await supabase
    .from('sync_schedules')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedSchedules = schedules as unknown as SyncScheduleRow[]

  return {
    data: typedSchedules.map((s) => ({
      id: s.id,
      storeId: s.store_id,
      syncType: s.sync_type as SyncType,
      intervalMinutes: s.interval_minutes,
      isEnabled: s.is_enabled,
      lastSyncAt: s.last_sync_at,
      nextSyncAt: s.next_sync_at,
      syncAtMinute: (s.sync_at_minute ?? 0) as 0 | 30,
      syncTime: s.sync_time,
      createdAt: s.created_at,
    })),
    error: null,
  }
}

export async function getLastSyncTime(): Promise<{
  data: string | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: schedule } = await supabase
    .from('sync_schedules')
    .select('last_sync_at')
    .eq('user_id', userData.user.id)
    .not('last_sync_at', 'is', null)
    .order('last_sync_at', { ascending: false })
    .limit(1)
    .single()

  return {
    data: schedule?.last_sync_at || null,
    error: null,
  }
}

export async function getSyncScheduleByStore(storeId: string): Promise<{
  data: SyncSchedule | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: schedule, error } = await supabase
    .from('sync_schedules')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('store_id', storeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { data: null, error: error.message }
  }

  const typedSchedule = schedule as unknown as SyncScheduleRow

  return {
    data: {
      id: typedSchedule.id,
      storeId: typedSchedule.store_id,
      syncType: typedSchedule.sync_type as SyncType,
      intervalMinutes: typedSchedule.interval_minutes,
      isEnabled: typedSchedule.is_enabled,
      lastSyncAt: typedSchedule.last_sync_at,
      nextSyncAt: typedSchedule.next_sync_at,
      syncAtMinute: (typedSchedule.sync_at_minute ?? 0) as 0 | 30,
      syncTime: typedSchedule.sync_time,
      createdAt: typedSchedule.created_at,
    },
    error: null,
  }
}

interface CreateOrUpdateSyncScheduleInput {
  storeId: string
  syncType: SyncType
  intervalMinutes: number
  isEnabled: boolean
  syncAtMinute?: 0 | 30
  syncTime?: string
}

function calculateNextSyncAt(
  intervalMinutes: number,
  syncAtMinute: 0 | 30 = 0,
  syncTime?: string
): string {
  const now = new Date()

  if (intervalMinutes === 1440 && syncTime) {
    const [hours, minutes] = syncTime.split(':').map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)

    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    return next.toISOString()
  }

  const currentMinute = now.getMinutes()
  const currentHour = now.getHours()

  let nextMinute: number
  let nextHour = currentHour

  if (intervalMinutes === 60) {
    nextMinute = syncAtMinute
    if (currentMinute >= syncAtMinute) {
      nextHour = currentHour + 1
    }
  } else if (intervalMinutes === 120) {
    nextMinute = syncAtMinute
    const hoursUntilNext = currentMinute >= syncAtMinute ? 1 : 0
    nextHour = currentHour + hoursUntilNext
    if (nextHour % 2 !== 0) {
      nextHour += 1
    }
  } else if (intervalMinutes === 360) {
    nextMinute = syncAtMinute
    const targetHours = [0, 6, 12, 18]
    const currentTotalMinutes = currentHour * 60 + currentMinute
    const syncMinuteOffset = syncAtMinute

    for (const h of targetHours) {
      if (h * 60 + syncMinuteOffset > currentTotalMinutes) {
        nextHour = h
        break
      }
    }
    if (nextHour <= currentHour && currentMinute >= syncAtMinute) {
      nextHour = targetHours[0]
      const next = new Date(now)
      next.setDate(next.getDate() + 1)
      next.setHours(nextHour, nextMinute, 0, 0)
      return next.toISOString()
    }
  } else if (intervalMinutes === 720) {
    nextMinute = syncAtMinute
    const targetHours = [0, 12]
    const currentTotalMinutes = currentHour * 60 + currentMinute
    const syncMinuteOffset = syncAtMinute

    for (const h of targetHours) {
      if (h * 60 + syncMinuteOffset > currentTotalMinutes) {
        nextHour = h
        break
      }
    }
    if (nextHour <= currentHour && currentMinute >= syncAtMinute) {
      nextHour = targetHours[0]
      const next = new Date(now)
      next.setDate(next.getDate() + 1)
      next.setHours(nextHour, nextMinute, 0, 0)
      return next.toISOString()
    }
  } else {
    const next = new Date(now.getTime() + intervalMinutes * 60 * 1000)
    return next.toISOString()
  }

  const next = new Date(now)
  next.setHours(nextHour, nextMinute, 0, 0)

  if (next <= now) {
    next.setHours(next.getHours() + Math.floor(intervalMinutes / 60))
  }

  return next.toISOString()
}

export async function createOrUpdateSyncSchedule(
  input: CreateOrUpdateSyncScheduleInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const nextSyncAt = input.isEnabled
    ? calculateNextSyncAt(input.intervalMinutes, input.syncAtMinute, input.syncTime)
    : null

  const { data: existing } = await supabase
    .from('sync_schedules')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('store_id', input.storeId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('sync_schedules')
      .update({
        sync_type: input.syncType,
        interval_minutes: input.intervalMinutes,
        is_enabled: input.isEnabled,
        sync_at_minute: input.syncAtMinute ?? 0,
        sync_time: input.syncTime ?? null,
        next_sync_at: nextSyncAt,
      })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase.from('sync_schedules').insert({
      user_id: userData.user.id,
      store_id: input.storeId,
      sync_type: input.syncType,
      interval_minutes: input.intervalMinutes,
      is_enabled: input.isEnabled,
      sync_at_minute: input.syncAtMinute ?? 0,
      sync_time: input.syncTime ?? null,
      next_sync_at: nextSyncAt,
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function toggleSyncSchedule(
  scheduleId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sync_schedules')
    .update({ is_enabled: isEnabled })
    .eq('id', scheduleId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true, error: null }
}

export async function updateLastSyncAt(
  scheduleId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data: schedule } = await supabase
    .from('sync_schedules')
    .select('interval_minutes, sync_at_minute, sync_time')
    .eq('id', scheduleId)
    .single()

  if (!schedule) {
    return { success: false, error: 'Schedule not found' }
  }

  const typedSchedule = schedule as unknown as {
    interval_minutes: number
    sync_at_minute: number | null
    sync_time: string | null
  }

  const nextSyncAt = calculateNextSyncAt(
    typedSchedule.interval_minutes,
    (typedSchedule.sync_at_minute ?? 0) as 0 | 30,
    typedSchedule.sync_time ?? undefined
  )

  const { error } = await supabase
    .from('sync_schedules')
    .update({
      last_sync_at: new Date().toISOString(),
      next_sync_at: nextSyncAt,
    })
    .eq('id', scheduleId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function getSyncLogs(
  scheduleId: string,
  limit: number = 10
): Promise<{ data: SyncLog[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error.message }
  }

  const typedLogs = logs as unknown as SyncLogRow[]

  return {
    data: typedLogs.map((l) => ({
      id: l.id,
      scheduleId: l.schedule_id,
      syncType: l.sync_type,
      status: l.status as SyncLog['status'],
      itemsSynced: l.items_synced,
      errorMessage: l.error_message,
      startedAt: l.started_at,
      completedAt: l.completed_at,
    })),
    error: null,
  }
}

export async function createSyncLog(
  scheduleId: string,
  syncType: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      schedule_id: scheduleId,
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: { id: data.id }, error: null }
}

export async function completeSyncLog(
  logId: string,
  status: 'success' | 'failed',
  itemsSynced: number,
  errorMessage?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sync_logs')
    .update({
      status,
      items_synced: itemsSynced,
      error_message: errorMessage || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function getDueSyncSchedules(): Promise<{
  data: Array<SyncSchedule & { userId: string; apiConfig: Record<string, string> }> | null
  error: string | null
}> {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data: schedules, error } = await supabase
    .from('sync_schedules')
    .select(`
      *,
      stores (
        api_config
      )
    `)
    .eq('is_enabled', true)
    .lte('next_sync_at', now)

  if (error) {
    return { data: null, error: error.message }
  }

  interface ScheduleWithStore extends SyncScheduleRow {
    user_id: string
    stores: { api_config: Record<string, string> } | null
  }

  const typedSchedules = schedules as unknown as ScheduleWithStore[]

  return {
    data: typedSchedules.map((s) => ({
      id: s.id,
      userId: s.user_id,
      storeId: s.store_id,
      syncType: s.sync_type as SyncType,
      intervalMinutes: s.interval_minutes,
      isEnabled: s.is_enabled,
      lastSyncAt: s.last_sync_at,
      nextSyncAt: s.next_sync_at,
      syncAtMinute: (s.sync_at_minute ?? 0) as 0 | 30,
      syncTime: s.sync_time,
      createdAt: s.created_at,
      apiConfig: s.stores?.api_config || {},
    })),
    error: null,
  }
}
