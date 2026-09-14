'use server'

import { createClient } from '@/lib/supabase/server'
import type { AiUsageType, AiUsageLog } from '@/types/database.types'
import { costKrw } from '@/lib/ai/pricing'

function formatCostKRW(usdCost: number): string {
  // Single rate with lib/ai/pricing — the AI tab renders the cap bar and this
  // summary side by side, so two rates showed one spend as two numbers
  const krwCost = costKrw(usdCost)
  if (krwCost > 0 && krwCost < 1) {
    return `약 ${krwCost.toFixed(2)}원`
  }
  return `약 ${Math.round(krwCost).toLocaleString()}원`
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
        totalCostKrw: formatCostKRW(totalCostUsd),
        usageByType,
        recentUsage: (logs || []).slice(0, 10),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: errorMessage }
  }
}
