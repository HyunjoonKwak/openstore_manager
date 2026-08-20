import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseJsonReply, AiJsonParseError } from '../src/lib/ai/json.ts'

test('plain JSON parses', () => {
  assert.deepEqual(parseJsonReply('{"a":1}'), { a: 1 })
})

test('surrounding whitespace is tolerated', () => {
  assert.deepEqual(parseJsonReply('\n  {"a": 1}\n\n'), { a: 1 })
})

test('markdown code fences are stripped', () => {
  assert.deepEqual(parseJsonReply('```json\n{"a": 1}\n```'), { a: 1 })
  assert.deepEqual(parseJsonReply('```\n{"a": 1}\n```'), { a: 1 })
})

test('a lead-in sentence before the JSON is skipped', () => {
  const reply = '분석 결과입니다:\n\n{"summary": "좋음", "score": 5}'
  assert.deepEqual(parseJsonReply(reply), { summary: '좋음', score: 5 })
})

test('trailing prose after the JSON is skipped', () => {
  const reply = '{"a": 1}\n\n추가 설명이 필요하면 알려주세요.'
  assert.deepEqual(parseJsonReply(reply), { a: 1 })
})

test('nested braces survive the outermost-brace fallback', () => {
  const reply = 'here:\n{"outer": {"inner": [1, 2]}}\nthanks'
  assert.deepEqual(parseJsonReply(reply), { outer: { inner: [1, 2] } })
})

test('non-JSON throws AiJsonParseError carrying the reply', () => {
  assert.throws(
    () => parseJsonReply('죄송하지만 분석할 수 없습니다.'),
    (error: unknown) =>
      error instanceof AiJsonParseError && error.reply.includes('죄송하지만')
  )
})

test('a truncated JSON object throws rather than returning partial data', () => {
  assert.throws(() => parseJsonReply('{"a": 1, "b":'), AiJsonParseError)
})

test('the stored reply is capped so a huge response does not bloat the log', () => {
  try {
    parseJsonReply('x'.repeat(5000))
    assert.fail('should have thrown')
  } catch (error) {
    assert.ok(error instanceof AiJsonParseError)
    assert.equal(error.reply.length, 500)
  }
})
