'use server'

import { createClient } from '@/lib/supabase/server'
import type { AiUsageType, AiUsageLog, Json } from '@/types/database.types'

// OpenAI pricing (2024 Q4, USD per 1K tokens) - update when pricing changes
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
}

export async function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<number> {
  const pricing = PRICING[model] || PRICING['gpt-4o-mini']
  const inputCost = (promptTokens / 1000) * pricing.input
  const outputCost = (completionTokens / 1000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}

export async function formatCostKRW(usdCost: number): Promise<string> {
  const krwRate = 1350
  const krwCost = usdCost * krwRate
  if (krwCost < 1) {
    return `약 ${krwCost.toFixed(2)}원`
  }
  return `약 ${Math.round(krwCost).toLocaleString()}원`
}

export interface RecordUsageParams {
  usageType: AiUsageType
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  metadata?: Json
}

export async function recordAiUsage(params: RecordUsageParams): Promise<{
  success: boolean
  data?: AiUsageLog
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return { success: false, error: 'User not authenticated' }
    }

    const estimatedCostUsd = await calculateCost(
      params.model,
      params.promptTokens,
      params.completionTokens
    )

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userData.user.id,
        usage_type: params.usageType,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: params.totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        metadata: params.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('[recordAiUsage] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export interface UsageSummary {
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCostUsd: number
  totalCostKrw: string
  usageByType: Record<AiUsageType, {
    count: number
    tokens: number
    cost: number
  }>
  recentUsage: AiUsageLog[]
}

export async function getAiUsageSummary(
  periodDays: number = 30
): Promise<{ data?: UsageSummary; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return { error: 'User not authenticated' }
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return { error: error.message }
    }

    const usageByType: Record<AiUsageType, { count: number; tokens: number; cost: number }> = {
      benchmarking_structure: { count: 0, tokens: 0, cost: 0 },
      benchmarking_style: { count: 0, tokens: 0, cost: 0 },
      benchmarking_image: { count: 0, tokens: 0, cost: 0 },
      ai_generate: { count: 0, tokens: 0, cost: 0 },
      ai_analyze: { count: 0, tokens: 0, cost: 0 },
    }

    let totalTokens = 0
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let totalCostUsd = 0

    for (const log of logs || []) {
      totalTokens += log.total_tokens
      totalPromptTokens += log.prompt_tokens
      totalCompletionTokens += log.completion_tokens
      totalCostUsd += log.estimated_cost_usd

      const usageType = log.usage_type as AiUsageType
      if (usageByType[usageType]) {
        usageByType[usageType].count += 1
        usageByType[usageType].tokens += log.total_tokens
        usageByType[usageType].cost += log.estimated_cost_usd
      }
    }

    return {
      data: {
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        totalCostUsd,
        totalCostKrw: await formatCostKRW(totalCostUsd),
        usageByType,
        recentUsage: (logs || []).slice(0, 10),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: errorMessage }
  }
}

export async function getTodayUsage(): Promise<{
  data?: { tokens: number; cost: number; costKrw: string; count: number }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return { error: 'User not authenticated' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens, estimated_cost_usd')
      .eq('user_id', userData.user.id)
      .gte('created_at', today.toISOString())

    if (error) {
      return { error: error.message }
    }

    const tokens = logs?.reduce((sum, log) => sum + log.total_tokens, 0) || 0
    const cost = logs?.reduce((sum, log) => sum + log.estimated_cost_usd, 0) || 0

    return {
      data: {
        tokens,
        cost,
        costKrw: await formatCostKRW(cost),
        count: logs?.length || 0,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: errorMessage }
  }
}
