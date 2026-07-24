import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseError, formatErrorMessage } from '../src/lib/error-messages.ts'

test('null/undefined 에러는 기본 안내 메시지를 반환한다', () => {
  for (const input of [null, undefined]) {
    const result = parseError(input)
    assert.equal(result.message, '알 수 없는 오류가 발생했습니다.')
    assert.equal(result.suggestion, '잠시 후 다시 시도해주세요.')
  }
})

test('빈 문자열 에러도 기본 안내 메시지를 반환한다', () => {
  const result = parseError('')
  assert.equal(result.message, '알 수 없는 오류가 발생했습니다.')
})

test('알려진 에러 코드 문자열을 한국어 메시지로 변환한다', () => {
  const result = parseError('invalid_credentials')
  assert.equal(result.message, '이메일 또는 비밀번호가 올바르지 않습니다.')
  assert.equal(result.code, 'invalid_credentials')
})

test('Error 인스턴스의 메시지에서 알려진 코드를 감지한다', () => {
  const result = parseError(new Error('Token expired'))
  assert.equal(result.message, '인증 토큰이 만료되었습니다. 다시 로그인해주세요.')
  assert.equal(result.code, 'Token expired')
})

test('메시지 안에 포함된 코드도 부분 일치로 감지한다', () => {
  const result = parseError('request failed: Naver API Error (500)')
  assert.equal(
    result.message,
    '네이버 API 연동 중 오류가 발생했습니다. API 키 설정을 확인해주세요.'
  )
})

test('Supabase 스타일 에러 객체는 code 필드로 매핑한다', () => {
  const result = parseError({ code: '23505', message: 'duplicate key value' })
  assert.equal(result.message, '이미 존재하는 데이터입니다. 중복된 값을 확인해주세요.')
  assert.equal(result.code, '23505')
})

test('알 수 없는 code라도 message 필드로 파싱한다', () => {
  const result = parseError({
    code: 'XX999',
    message: 'update violates foreign key constraint "fk_orders"',
  })
  assert.equal(result.message, '연결된 데이터가 있어 삭제할 수 없습니다.')
  assert.equal(result.suggestion, '먼저 연결된 항목을 삭제하거나 해제해주세요.')
})

test('duplicate key / unique constraint 메시지를 변환한다', () => {
  const result = parseError('ERROR: duplicate key value violates something')
  assert.equal(result.message, '이미 존재하는 데이터입니다.')
  assert.equal(result.suggestion, '다른 값을 입력해주세요.')
})

test('null value 메시지는 필수 입력값 누락으로 변환한다', () => {
  const result = parseError('null value in column "name"')
  assert.equal(result.message, '필수 입력값이 누락되었습니다.')
  assert.equal(result.suggestion, '모든 필수 항목을 입력해주세요.')
})

test('도메인과 액션이 주어지면 액션별 메시지를 사용한다', () => {
  const result = parseError('randomly failed', 'product', 'create')
  assert.equal(
    result.message,
    '상품 등록에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요.'
  )
  assert.equal(result.suggestion, undefined)
})

test('액션 매핑이 없으면 도메인 기본 메시지로 폴백한다', () => {
  // 'fetch' action has no ACTION_ERROR_MESSAGES entry
  const result = parseError('randomly failed', 'product', 'fetch')
  assert.equal(result.message, '상품 처리 중 오류가 발생했습니다.')
  assert.equal(result.suggestion, '잠시 후 다시 시도해주세요.')
})

test('도메인만 주어지면 도메인 기본 메시지를 사용한다', () => {
  const result = parseError('randomly failed', 'sync')
  assert.equal(result.message, '동기화 중 오류가 발생했습니다.')
})

test('기술적인 DB 에러 메시지는 사용자에게 노출하지 않는다', () => {
  const result = parseError('relation "orders" does not exist')
  assert.equal(result.message, '오류가 발생했습니다.')
  assert.equal(result.suggestion, '잠시 후 다시 시도해주세요.')
})

test('기술 패턴이 아닌 일반 메시지는 그대로 전달한다', () => {
  const result = parseError('Something odd happened')
  assert.equal(result.message, 'Something odd happened')
  assert.equal(result.suggestion, '잠시 후 다시 시도해주세요.')
})

test('message 없는 알 수 없는 객체는 도메인 기본 메시지를 사용한다', () => {
  assert.equal(parseError({}, 'order').message, '주문 처리 중 오류가 발생했습니다.')
  assert.equal(parseError({ code: 'XYZ' }).message, '오류가 발생했습니다.')
})

test('formatErrorMessage는 suggestion 유무에 따라 문자열을 조합한다', () => {
  assert.equal(
    formatErrorMessage({ message: '실패했습니다.', suggestion: '다시 시도해주세요.' }),
    '실패했습니다. 다시 시도해주세요.'
  )
  assert.equal(formatErrorMessage({ message: '실패했습니다.' }), '실패했습니다.')
})
