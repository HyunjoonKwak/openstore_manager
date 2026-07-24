import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeCsvCell, parseCsvLine } from '../src/lib/csv.ts'
import { sanitizeRedirectPath } from '../src/lib/security.ts'
import { timingSafeEqualString } from '../src/lib/timing-safe.ts'
import { checkRateLimit } from '../src/lib/rate-limit.ts'

test('sanitizeCsvCell은 수식 시작 문자를 무력화한다', () => {
  assert.equal(sanitizeCsvCell('=cmd|calc'), "'=cmd|calc")
  assert.equal(sanitizeCsvCell('+1234'), "'+1234")
  assert.equal(sanitizeCsvCell('-총계'), "'-총계")
  assert.equal(sanitizeCsvCell('@SUM(A1)'), "'@SUM(A1)")
  assert.equal(sanitizeCsvCell('일반 텍스트'), '일반 텍스트')
})

test('sanitizeCsvCell은 구분자·따옴표를 CSV 규칙대로 인용한다', () => {
  assert.equal(sanitizeCsvCell('서울시, 강남구'), '"서울시, 강남구"')
  assert.equal(sanitizeCsvCell('별명 "짱"'), '"별명 ""짱"""')
  assert.equal(sanitizeCsvCell(null), '')
  assert.equal(sanitizeCsvCell(undefined), '')
  assert.equal(sanitizeCsvCell(123), '123')
})

test('parseCsvLine은 따옴표 안의 콤마와 이스케이프 따옴표를 처리한다', () => {
  assert.deepEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c'])
  assert.deepEqual(parseCsvLine('"서울시, 강남구",홍길동'), ['서울시, 강남구', '홍길동'])
  assert.deepEqual(parseCsvLine('"별명 ""짱""",x'), ['별명 "짱"', 'x'])
  assert.deepEqual(parseCsvLine(''), [''])
  assert.deepEqual(parseCsvLine('a,,c'), ['a', '', 'c'])
})

test('sanitizeCsvCell 출력이 parseCsvLine으로 왕복된다', () => {
  const values = ['서울시, 강남구', '별명 "짱"', '일반']
  const line = values.map(v => sanitizeCsvCell(v)).join(',')
  assert.deepEqual(parseCsvLine(line), values)
})

test('sanitizeRedirectPath는 같은 오리진 경로만 허용한다', () => {
  assert.equal(sanitizeRedirectPath('/dashboard'), '/dashboard')
  assert.equal(sanitizeRedirectPath('/a/b?c=1'), '/a/b?c=1')
  assert.equal(sanitizeRedirectPath('//evil.com'), '/')
  assert.equal(sanitizeRedirectPath('/\\evil.com'), '/')
  assert.equal(sanitizeRedirectPath('https://evil.com'), '/')
  assert.equal(sanitizeRedirectPath('@evil.com'), '/')
  assert.equal(sanitizeRedirectPath(''), '/')
  assert.equal(sanitizeRedirectPath(null), '/')
  assert.equal(sanitizeRedirectPath(undefined), '/')
})

test('timingSafeEqualString은 길이가 달라도 안전하게 비교한다', () => {
  assert.equal(timingSafeEqualString('secret', 'secret'), true)
  assert.equal(timingSafeEqualString('secret', 'Secret'), false)
  assert.equal(timingSafeEqualString('secret', 'secret-longer'), false)
  assert.equal(timingSafeEqualString('', ''), true)
  assert.equal(timingSafeEqualString('a', ''), false)
})

test('checkRateLimit은 윈도우 내 초과 요청을 차단한다', () => {
  const key = `test-${process.pid}-${Math.random()}`
  const options = { limit: 3, windowMs: 60_000 }

  assert.equal(checkRateLimit(key, options).allowed, true)
  assert.equal(checkRateLimit(key, options).allowed, true)
  assert.equal(checkRateLimit(key, options).allowed, true)

  const denied = checkRateLimit(key, options)
  assert.equal(denied.allowed, false)
  assert.ok(denied.retryAfterSeconds >= 1)
})

test('checkRateLimit은 키별로 독립적으로 집계한다', () => {
  const keyA = `test-a-${Math.random()}`
  const keyB = `test-b-${Math.random()}`
  const options = { limit: 1, windowMs: 60_000 }

  assert.equal(checkRateLimit(keyA, options).allowed, true)
  assert.equal(checkRateLimit(keyB, options).allowed, true)
  assert.equal(checkRateLimit(keyA, options).allowed, false)
})
