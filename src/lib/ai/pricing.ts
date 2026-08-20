// Claude pricing, USD per 1M tokens. Update when Anthropic changes rates.
// Source: platform.claude.com/docs/en/pricing

export const AI_MODEL = 'claude-haiku-4-5' as const

export const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-opus-5': { input: 5.0, output: 25.0 },
}

// Legacy OpenAI rows already in ai_usage_logs stay priceable so historical
// totals keep rendering. USD per 1M tokens.
const LEGACY_OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
}

/** USD/KRW used for the spend cap and display. Approximate by design. */
export const KRW_PER_USD = 1480

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing =
    CLAUDE_PRICING[model] || LEGACY_OPENAI_PRICING[model] || CLAUDE_PRICING[AI_MODEL]
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
  return Number(cost.toFixed(6))
}

export function costKrw(usd: number): number {
  return usd * KRW_PER_USD
}

export function formatKrw(usd: number): string {
  const krw = costKrw(usd)
  if (krw < 1) return `약 ${krw.toFixed(2)}원`
  return `약 ${Math.round(krw).toLocaleString('ko-KR')}원`
}
