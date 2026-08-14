'use server'

import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import type { MarketPlatformDb, SettlementRow } from '@/types/redesign.types'

export interface SettlementView {
  id: string
  marketAccountId: string
  marketAccountName: string
  platform: MarketPlatformDb
  settlementDate: string
  orderCount: number
  salesAmount: number
  commissionAmount: number
  deliveryFeeAmount: number
  discountAmount: number
  settlementAmount: number
  status: string
}

interface SettlementQueryRow extends SettlementRow {
  market_accounts: { name: string; platform: MarketPlatformDb } | null
}

export async function getSettlements(params?: {
  marketAccountId?: string
  fromDate?: string
  limit?: number
}): Promise<{ data: SettlementView[] | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  let query = supabase
    .from('settlements')
    .select('*, market_accounts (name, platform)')
    .order('settlement_date', { ascending: false })
    .limit(params?.limit || 120)

  if (params?.marketAccountId) query = query.eq('market_account_id', params.marketAccountId)
  if (params?.fromDate) query = query.gte('settlement_date', params.fromDate)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }

  return {
    data: ((data || []) as unknown as SettlementQueryRow[]).map((row) => ({
      id: row.id,
      marketAccountId: row.market_account_id,
      marketAccountName: row.market_accounts?.name || '(삭제된 계정)',
      platform: row.market_accounts?.platform || 'naver',
      settlementDate: row.settlement_date,
      orderCount: row.order_count,
      salesAmount: row.sales_amount,
      commissionAmount: row.commission_amount,
      deliveryFeeAmount: row.delivery_fee_amount,
      discountAmount: row.discount_amount,
      settlementAmount: row.settlement_amount,
      status: row.status,
    })),
    error: null,
  }
}
