import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { JSON_ONLY_INSTRUCTION } from './json'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { decryptSecret } from '@/lib/secret-crypto'
import { AI_MODEL, costKrw, costUsd } from './pricing'

// Single entry point for every AI call. Resolves the user's key, enforces
// the monthly spend cap before spending anything, calls Claude, then
// records usage. Callers never construct an Anthropic client themselves.

export {
  toImageBlock,
  isSupportedImageType,
  UnsupportedImageTypeError,
  MAX_IMAGE_BYTES,
  type SupportedImageType,
} from './images'
export { parseJsonReply, AiJsonParseError } from './json'

export interface AiSettings {
  apiKey: string | null
  monthlyLimitKrw: number
}

interface AiConfigJson {
  anthropicApiKey?: string
}

export async function getAiSettings(): Promise<AiSettings> {
  const supabase = await createRedesignClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { apiKey: null, monthlyLimitKrw: 0 }

  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => PromiseLike<{
            data: { ai_config: AiConfigJson; ai_monthly_limit_krw: number } | null
          }>
        }
      }
    }
  }
  const { data } = await client
    .from('user_settings')
    .select('ai_config, ai_monthly_limit_krw')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const stored = data?.ai_config?.anthropicApiKey
  let apiKey: string | null = null
  if (stored) {
    try {
      apiKey = decryptSecret(stored)
    } catch (error) {
      console.error('Failed to decrypt Anthropic key:', error)
    }
  }
  // Server-level key is the fallback for single-user deployments
  if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY || null

  return {
    apiKey,
    monthlyLimitKrw: data?.ai_monthly_limit_krw ?? 3000,
  }
}

export interface MonthlySpend {
  spentKrw: number
  limitKrw: number
  remainingKrw: number
  exceeded: boolean
}

/** Month-to-date spend against the cap. Callers gate on `exceeded`. */
export async function getMonthlySpend(settings?: AiSettings): Promise<MonthlySpend> {
  const { monthlyLimitKrw } = settings ?? (await getAiSettings())
  const supabase = await createRedesignClient()
  const { data: userData } = await supabase.auth.getUser()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let spentUsd = 0
  if (userData.user) {
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (c: string, v: string) => {
            gte: (c: string, v: string) => PromiseLike<{
              data: Array<{ estimated_cost_usd: number }> | null
            }>
          }
        }
      }
    }
    const { data } = await client
      .from('ai_usage_logs')
      .select('estimated_cost_usd')
      .eq('user_id', userData.user.id)
      .gte('created_at', startOfMonth.toISOString())

    spentUsd = (data || []).reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0)
  }

  const spentKrw = costKrw(spentUsd)
  return {
    spentKrw,
    limitKrw: monthlyLimitKrw,
    remainingKrw: Math.max(0, monthlyLimitKrw - spentKrw),
    exceeded: spentKrw >= monthlyLimitKrw,
  }
}

export type AiUsageType =
  | 'benchmarking_structure'
  | 'benchmarking_style'
  | 'benchmarking_image'
  | 'ai_generate'
  | 'ai_analyze'

export interface AiCallInput {
  usageType: AiUsageType
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens: number
  temperature?: number
  /** Recorded alongside usage so a spend spike can be traced to its cause. */
  metadata?: Record<string, unknown>
  /** Constrains the reply to this JSON schema (structured outputs). */
  jsonSchema?: Record<string, unknown>
  /** Appends a JSON-only instruction; pair with parseJsonReply(). */
  jsonOnly?: boolean
}

export type AiCallResult =
  | { ok: true; text: string; inputTokens: number; outputTokens: number; costUsd: number }
  | { ok: false; error: string; code: 'no_key' | 'limit_exceeded' | 'api_error' }

async function recordUsage(
  usageType: AiUsageType,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createRedesignClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const client = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
      }
    }
    const { error } = await client.from('ai_usage_logs').insert({
      user_id: userData.user.id,
      usage_type: usageType,
      model: AI_MODEL,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_usd: cost,
      metadata,
    })

    // The spend cap is computed from these rows and nothing else, so a
    // rejected insert silently disables it. Surface it loudly.
    if (error) {
      console.error(
        `[ai] usage insert rejected — the monthly cap is now under-counting: ${error.message}`
      )
    }
  } catch (error) {
    // Usage logging must never break the feature it measures
    console.error('Failed to record AI usage:', error)
  }
}

/**
 * Call Claude with the spend cap enforced up front. Errors are values —
 * callers surface `error` rather than catching exceptions.
 */
export async function callClaude(input: AiCallInput): Promise<AiCallResult> {
  const settings = await getAiSettings()
  const { apiKey, monthlyLimitKrw } = settings
  if (!apiKey) {
    return {
      ok: false,
      code: 'no_key',
      error: 'AI 기능을 쓰려면 설정 > AI에서 Anthropic API 키를 입력해주세요.',
    }
  }
  if (monthlyLimitKrw === 0) {
    return { ok: false, code: 'limit_exceeded', error: 'AI 기능이 꺼져 있습니다 (월 한도 0원).' }
  }

  const spend = await getMonthlySpend(settings)
  if (spend.exceeded) {
    return {
      ok: false,
      code: 'limit_exceeded',
      error: `이번 달 AI 사용 한도(${monthlyLimitKrw.toLocaleString()}원)를 모두 썼습니다. 설정에서 한도를 올리거나 다음 달까지 기다려주세요.`,
    }
  }

  try {
    const client = new Anthropic({ apiKey })
    const system = [input.system, input.jsonOnly ? JSON_ONLY_INSTRUCTION : null]
      .filter(Boolean)
      .join('\n\n')

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: input.maxTokens,
      ...(system ? { system } : {}),
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      messages: input.messages,
      ...(input.jsonSchema
        ? { output_config: { format: { type: 'json_schema' as const, schema: input.jsonSchema } } }
        : {}),
    })

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const cost = costUsd(AI_MODEL, inputTokens, outputTokens)
    await recordUsage(input.usageType, inputTokens, outputTokens, cost, input.metadata)

    if (response.stop_reason === 'refusal') {
      return { ok: false, code: 'api_error', error: 'AI가 이 요청에 응답할 수 없습니다.' }
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return { ok: true, text, inputTokens, outputTokens, costUsd: cost }
  } catch (error) {
    // Provider messages can carry request echoes and internal detail —
    // log them, return a fixed message
    const message = error instanceof Anthropic.APIError ? error.message : String(error)
    console.error('Claude call failed:', message)
    return {
      ok: false,
      code: 'api_error',
      error: 'AI 호출에 실패했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}

/** Vision variant: same gate, image blocks in the user turn. */
export async function callClaudeWithImage(input: {
  usageType: AiUsageType
  system?: string
  prompt: string
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  maxTokens: number
}): Promise<AiCallResult> {
  return callClaude({
    usageType: input.usageType,
    system: input.system,
    maxTokens: input.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: input.mediaType, data: input.imageBase64 },
          },
          { type: 'text', text: input.prompt },
        ],
      },
    ],
  })
}

/**
 * Verify the stored key reaches Anthropic. Deliberately skips the monthly cap
 * gate so a capped user can still confirm their key is valid — but the ping is
 * still recorded, so every call that costs money lands in ai_usage_logs.
 */
export async function testClaudeConnection(): Promise<{ ok: boolean; error: string | null }> {
  const { apiKey } = await getAiSettings()
  if (!apiKey) {
    return { ok: false, error: 'Anthropic API 키가 설정되지 않았습니다.' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ping' }],
    })

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    await recordUsage('ai_analyze', inputTokens, outputTokens, costUsd(AI_MODEL, inputTokens, outputTokens), {
      source: 'connection_test',
    })

    return { ok: true, error: null }
  } catch (error) {
    const raw = error instanceof Anthropic.APIError ? error.message : String(error)
    console.error('Claude connection test failed:', raw)

    const status = error instanceof Anthropic.APIError ? error.status : undefined
    if (status === 401 || status === 403) {
      return { ok: false, error: 'API 키가 올바르지 않습니다.' }
    }
    if (status === 429) {
      return { ok: false, error: 'Anthropic 사용량 한도에 걸렸습니다.' }
    }
    if (status === 400) {
      return { ok: false, error: '요청이 거부되었습니다. 키의 권한과 크레딧을 확인해주세요.' }
    }
    return { ok: false, error: 'Anthropic에 연결하지 못했습니다.' }
  }
}
