import type { AiCallResult } from './claude'

type AiErrorCode = Extract<AiCallResult, { ok: false }>['code']

/**
 * Single mapping for AI failures so every route answers the same way.
 * `no_key` is a missing user setting, not an outage — 400, not 503, so
 * clients and proxies do not retry it.
 */
export function aiErrorStatus(code: AiErrorCode): number {
  if (code === 'limit_exceeded') return 429
  if (code === 'no_key') return 400
  return 502
}
