import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { decryptSecret } from '@/lib/secret-crypto'
import { AI_MODEL, costKrw, costUsd } from './pricing'

// Single entry point for every AI call. Resolves the user's key, enforces
// the monthly spend cap before spending anything, calls Claude, then
// records usage. Callers never construct an Anthropic client themselves.

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

/**
 * Convert a data: URL or an http(s) URL into a Claude image block.
 * OpenAI accepted either shape under one `image_url` field; Claude needs
 * the base64 payload and media type split out.
 */
export function toImageBlock(source: string): Anthropic.ImageBlockParam {
  const dataUrl = source.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (dataUrl) {
    const mediaType = dataUrl[1].toLowerCase()
    const supported = (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType)
      ? (mediaType as SupportedImageType)
      : 'image/png'
    return { type: 'image', source: { type: 'base64', media_type: supported, data: dataUrl[2] } }
  }
  return { type: 'image', source: { type: 'url', url: source } }
}

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
export async function getMonthlySpend(): Promise<MonthlySpend> {
  const { monthlyLimitKrw } = await getAiSettings()
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
  /** Constrains the reply to this JSON schema (structured outputs). */
  jsonSchema?: Record<string, unknown>
}

export type AiCallResult =
  | { ok: true; text: string; inputTokens: number; outputTokens: number; costUsd: number }
  | { ok: false; error: string; code: 'no_key' | 'limit_exceeded' | 'api_error' }

async function recordUsage(
  usageType: AiUsageType,
  inputTokens: number,
  outputTokens: number,
  cost: number
) {
  try {
    const supabase = await createRedesignClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const client = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>
      }
    }
    await client.from('ai_usage_logs').insert({
      user_id: userData.user.id,
      usage_type: usageType,
      model: AI_MODEL,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_usd: cost,
    })
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
  const { apiKey, monthlyLimitKrw } = await getAiSettings()
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

  const spend = await getMonthlySpend()
  if (spend.exceeded) {
    return {
      ok: false,
      code: 'limit_exceeded',
      error: `이번 달 AI 사용 한도(${monthlyLimitKrw.toLocaleString()}원)를 모두 썼습니다. 설정에서 한도를 올리거나 다음 달까지 기다려주세요.`,
    }
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: input.maxTokens,
      ...(input.system ? { system: input.system } : {}),
      messages: input.messages,
      ...(input.jsonSchema
        ? { output_config: { format: { type: 'json_schema' as const, schema: input.jsonSchema } } }
        : {}),
    })

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const cost = costUsd(AI_MODEL, inputTokens, outputTokens)
    await recordUsage(input.usageType, inputTokens, outputTokens, cost)

    if (response.stop_reason === 'refusal') {
      return { ok: false, code: 'api_error', error: 'AI가 이 요청에 응답할 수 없습니다.' }
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return { ok: true, text, inputTokens, outputTokens, costUsd: cost }
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? error.message : String(error)
    console.error('Claude call failed:', message)
    return { ok: false, code: 'api_error', error: `AI 호출에 실패했습니다: ${message}` }
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
 * gate so a capped user can still confirm their key is valid.
 */
export async function testClaudeConnection(): Promise<{ ok: boolean; error: string | null }> {
  const { apiKey } = await getAiSettings()
  if (!apiKey) {
    return { ok: false, error: 'Anthropic API 키가 설정되지 않았습니다.' }
  }

  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { ok: true, error: null }
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? error.message : String(error)
    return { ok: false, error: message }
  }
}
