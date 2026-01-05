'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database.types'

export interface AnalysisLog {
  id: string
  userId: string
  targetUrl: string
  targetPlatform: string
  analysisResult: Json
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
}

interface AnalysisLogRow {
  id: string
  user_id: string
  target_url: string
  target_platform: string
  analysis_result: Json
  status: string
  created_at: string
}

export async function createAnalysisLog(input: {
  targetUrl: string
  targetPlatform: string
}): Promise<{ data: AnalysisLog | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('analysis_logs')
    .insert({
      user_id: userData.user.id,
      target_url: input.targetUrl,
      target_platform: input.targetPlatform,
      status: 'pending',
      analysis_result: {},
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as AnalysisLogRow

  return {
    data: {
      id: typedData.id,
      userId: typedData.user_id,
      targetUrl: typedData.target_url,
      targetPlatform: typedData.target_platform,
      analysisResult: typedData.analysis_result,
      status: typedData.status as 'pending' | 'completed' | 'failed',
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

export async function updateAnalysisLog(
  id: string,
  analysisResult: Json,
  status: 'completed' | 'failed'
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('analysis_logs')
    .update({
      analysis_result: analysisResult,
      status,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/benchmarking')
  return { success: true, error: null }
}

export async function getAnalysisLogs(): Promise<{
  data: AnalysisLog[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('analysis_logs')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as AnalysisLogRow[]

  return {
    data: typedData.map((log) => ({
      id: log.id,
      userId: log.user_id,
      targetUrl: log.target_url,
      targetPlatform: log.target_platform,
      analysisResult: log.analysis_result,
      status: log.status as 'pending' | 'completed' | 'failed',
      createdAt: log.created_at,
    })),
    error: null,
  }
}

export async function getAnalysisById(id: string): Promise<{
  data: AnalysisLog | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('analysis_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as AnalysisLogRow

  return {
    data: {
      id: typedData.id,
      userId: typedData.user_id,
      targetUrl: typedData.target_url,
      targetPlatform: typedData.target_platform,
      analysisResult: typedData.analysis_result,
      status: typedData.status as 'pending' | 'completed' | 'failed',
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

export async function deleteAnalysisLog(id: string): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('analysis_logs')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/benchmarking')
  return { success: true, error: null }
}
