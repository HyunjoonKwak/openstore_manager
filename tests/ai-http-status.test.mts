import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aiErrorStatus } from '../src/lib/ai/http-status.ts'

test('a missing key is a client configuration problem, not an outage', () => {
  // 503 would invite clients and proxies to retry a request that can never
  // succeed until the user sets a key
  assert.equal(aiErrorStatus('no_key'), 400)
})

test('a spent cap maps to 429', () => {
  assert.equal(aiErrorStatus('limit_exceeded'), 429)
})

test('an upstream failure maps to 502', () => {
  assert.equal(aiErrorStatus('api_error'), 502)
})
