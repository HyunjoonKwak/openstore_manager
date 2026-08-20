import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AI_MODEL, costKrw, costUsd, formatKrw, KRW_PER_USD } from '../src/lib/ai/pricing.ts'

test('haiku pricing matches the published rate', () => {
  // $1 per 1M input, $5 per 1M output
  assert.equal(costUsd('claude-haiku-4-5', 1_000_000, 0), 1)
  assert.equal(costUsd('claude-haiku-4-5', 0, 1_000_000), 5)
})

test('a realistic detail-page generation costs single-digit won', () => {
  const usd = costUsd(AI_MODEL, 1_000, 800)
  const krw = costKrw(usd)
  assert.ok(krw > 0 && krw < 20, `expected under 20 KRW, got ${krw}`)
})

test('legacy OpenAI rows stay priceable', () => {
  assert.ok(costUsd('gpt-4o-mini', 1_000_000, 0) > 0)
  assert.equal(costUsd('gpt-4o', 1_000_000, 0), 2.5)
})

test('unknown models fall back to the default model rate', () => {
  assert.equal(costUsd('some-future-model', 1_000_000, 0), costUsd(AI_MODEL, 1_000_000, 0))
})

test('krw formatting keeps sub-won amounts visible', () => {
  assert.match(formatKrw(0.0001), /^약 0\.\d+원$/)
})

test('the usd→krw rate is a plausible, explicitly pinned value', () => {
  // Pinned deliberately: an unnoticed drift here silently mis-reports every
  // spend figure and shifts where the monthly cap bites
  assert.equal(KRW_PER_USD, 1480)
  assert.equal(costKrw(1), 1480)
  assert.equal(formatKrw(1), '약 1,480원')
})
