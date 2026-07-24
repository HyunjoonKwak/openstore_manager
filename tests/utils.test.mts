import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cn } from '../src/lib/utils.ts'

test('여러 클래스 문자열을 공백으로 합친다', () => {
  assert.equal(cn('foo', 'bar'), 'foo bar')
})

test('falsy 값(false, null, undefined, 빈 문자열)은 무시한다', () => {
  assert.equal(cn('foo', false, null, undefined, '', 'bar'), 'foo bar')
})

test('인자가 없으면 빈 문자열을 반환한다', () => {
  assert.equal(cn(), '')
})

test('배열과 객체 형태의 조건부 클래스를 지원한다', () => {
  assert.equal(cn(['a', 'b'], { c: true, d: false }), 'a b c')
})

test('충돌하는 Tailwind 유틸리티는 마지막 값이 이긴다', () => {
  assert.equal(cn('px-2', 'px-4'), 'px-4')
  assert.equal(cn('text-red-500', 'text-blue-500'), 'text-blue-500')
})

test('충돌하지 않는 Tailwind 클래스는 모두 유지한다', () => {
  assert.equal(cn('px-2', 'py-4'), 'px-2 py-4')
})

test('조건부로 덮어쓰는 실제 사용 패턴이 동작한다', () => {
  const isActive = true
  assert.equal(
    cn('rounded bg-gray-100', isActive && 'bg-blue-500'),
    'rounded bg-blue-500'
  )
})
