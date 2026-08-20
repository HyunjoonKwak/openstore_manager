'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { encryptSecret, isEncryptedSecret } from '@/lib/secret-crypto'
import { getAiSettings, getMonthlySpend } from '@/lib/ai/claude'
import { AI_MODEL } from '@/lib/ai/pricing'
import { MAX_LIMIT_KRW } from '@/lib/ai/limits'

export interface AiSettingsView {
  /** True when a key is reachable — either stored per-user or from the server env */
  hasKey: boolean
  /** True only when the key lives in this user's settings row */
  hasOwnKey: boolean
  monthlyLimitKrw: number
  spentKrw: number
  remainingKrw: number
  exceeded: boolean
  callCount: number
  model: string
}

const saveSchema = z.object({
  apiKey: z.string().trim().max(500).optional(),
  monthlyLimitKrw: z.number().int().min(0).max(MAX_LIMIT_KRW),
})

export type SaveAiSettingsInput = z.infer<typeof saveSchema>

export async function getAiSettingsView(): Promise<{
  data: AiSettingsView | null
  error: string | null
}> {
  try {
    const supabase = await createRedesignClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { data: null, error: '로그인이 필요합니다.' }

    const settings = await getAiSettings()
    const spend = await getMonthlySpend(settings)
    const { apiKey } = settings

    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string, opts?: { count: 'exact'; head: true }) => {
          eq: (c: string, v: string) => {
            gte: (c: string, v: string) => PromiseLike<{ count: number | null }>
            maybeSingle: () => PromiseLike<{
              data: { ai_config: { anthropicApiKey?: string } } | null
            }>
          }
        }
      }
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [settingsRow, usageCount] = await Promise.all([
      client.from('user_settings').select('ai_config').eq('user_id', userData.user.id).maybeSingle(),
      client
        .from('ai_usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .gte('created_at', startOfMonth.toISOString()),
    ])

    return {
      data: {
        hasKey: Boolean(apiKey),
        hasOwnKey: Boolean(settingsRow.data?.ai_config?.anthropicApiKey),
        monthlyLimitKrw: spend.limitKrw,
        spentKrw: spend.spentKrw,
        remainingKrw: spend.remainingKrw,
        exceeded: spend.exceeded,
        callCount: usageCount.count ?? 0,
        model: AI_MODEL,
      },
      error: null,
    }
  } catch (error) {
    console.error('Failed to load AI settings:', error)
    return { data: null, error: 'AI 설정을 불러오지 못했습니다.' }
  }
}

/**
 * Saves the monthly cap always; the key only when a non-empty value is given,
 * so the UI can submit the limit without re-entering the key.
 */
export async function saveAiSettings(
  input: SaveAiSettingsInput
): Promise<{ error: string | null }> {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `입력값이 올바르지 않습니다. 한도는 0~${MAX_LIMIT_KRW.toLocaleString()}원 사이여야 합니다.` }
  }

  try {
    const supabase = await createRedesignClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { error: '로그인이 필요합니다.' }

    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => PromiseLike<{
              data: { ai_config: Record<string, unknown> } | null
              error: { message: string } | null
            }>
          }
        }
        upsert: (
          values: Record<string, unknown>,
          opts: { onConflict: string }
        ) => PromiseLike<{ error: { message: string } | null }>
      }
    }

    const key = parsed.data.apiKey?.trim()

    // Only touch ai_config when a new key was supplied. Saving the cap alone
    // must never rewrite the stored key — including when the read below fails.
    let aiConfigPatch: Record<string, unknown> | null = null
    if (key) {
      const encrypted = encryptSecret(key)
      if (!isEncryptedSecret(encrypted)) {
        return {
          error:
            '서버에 암호화 키(SECRETS_ENCRYPTION_KEY)가 없어 API 키를 저장할 수 없습니다. 관리자에게 문의해주세요.',
        }
      }

      const { data: existing, error: readError } = await client
        .from('user_settings')
        .select('ai_config')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (readError) {
        console.error('Failed to read existing AI settings:', readError.message)
        return { error: '기존 설정을 읽지 못해 저장을 중단했습니다. 잠시 후 다시 시도해주세요.' }
      }

      aiConfigPatch = { ...(existing?.ai_config ?? {}), anthropicApiKey: encrypted }
    }

    const { error } = await client.from('user_settings').upsert(
      {
        user_id: userData.user.id,
        ...(aiConfigPatch ? { ai_config: aiConfigPatch } : {}),
        ai_monthly_limit_krw: parsed.data.monthlyLimitKrw,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('Failed to save AI settings:', error.message)
      return { error: 'AI 설정 저장에 실패했습니다.' }
    }

    revalidatePath('/settings')
    return { error: null }
  } catch (error) {
    console.error('Failed to save AI settings:', error)
    return { error: 'AI 설정 저장에 실패했습니다.' }
  }
}

/** Clears the per-user key so the server-level env key (if any) takes over. */
export async function clearAiApiKey(): Promise<{ error: string | null }> {
  try {
    const supabase = await createRedesignClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { error: '로그인이 필요합니다.' }

    const client = supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (c: string, v: string) => PromiseLike<{ error: { message: string } | null }>
        }
      }
    }

    const { error } = await client
      .from('user_settings')
      .update({ ai_config: {}, updated_at: new Date().toISOString() })
      .eq('user_id', userData.user.id)

    if (error) {
      console.error('Failed to clear AI key:', error.message)
      return { error: 'API 키 삭제에 실패했습니다.' }
    }

    revalidatePath('/settings')
    return { error: null }
  } catch (error) {
    console.error('Failed to clear AI key:', error)
    return { error: 'API 키 삭제에 실패했습니다.' }
  }
}
