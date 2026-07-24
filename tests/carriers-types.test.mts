import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CARRIERS,
  getCarrierById,
  getCarrierByName,
  getAllCarriers,
  predictCarriers,
} from '../src/lib/carriers/types.ts'

test('getCarrierById는 대소문자를 구분하지 않는다', () => {
  assert.equal(getCarrierById('CJ')?.displayName, 'CJ대한통운')
  assert.equal(getCarrierById('cj')?.displayName, 'CJ대한통운')
  assert.equal(getCarrierById('hanjin')?.displayName, '한진택배')
})

test('getCarrierById는 없는 ID에 대해 null을 반환한다', () => {
  assert.equal(getCarrierById('NOT_A_CARRIER'), null)
})

test('getCarrierByName은 내부 name으로 조회한다', () => {
  assert.equal(getCarrierByName('kr.epost')?.id, 'EPOST')
  assert.equal(getCarrierByName('kr.cjlogistics')?.id, 'CJ')
  assert.equal(getCarrierByName('kr.unknown'), null)
})

test('getAllCarriers는 등록된 모든 캐리어를 반환한다', () => {
  const all = getAllCarriers()
  assert.equal(all.length, Object.keys(CARRIERS).length)
  const ids = all.map((c) => c.id)
  assert.ok(ids.includes('CJ'))
  assert.ok(ids.includes('EPOST_EMS'))
})

test('빈 운송장 번호는 빈 배열을 반환한다', () => {
  assert.deepEqual(predictCarriers(''), [])
  assert.deepEqual(predictCarriers('  - '), [])
})

test('10자리 숫자는 CJ대한통운으로 예측한다', () => {
  assert.deepEqual(
    predictCarriers('6405998046').map((c) => c.id),
    ['CJ']
  )
})

test('12자리 숫자는 한진/CJ/롯데 후보를 반환한다', () => {
  assert.deepEqual(
    predictCarriers('418011254849').map((c) => c.id),
    ['HANJIN', 'CJ', 'LOTTE']
  )
})

test('13자리 숫자는 우체국택배로 예측한다', () => {
  assert.deepEqual(
    predictCarriers('6900083513037').map((c) => c.id),
    ['EPOST']
  )
})

test('14자리 숫자는 한진택배로 예측한다', () => {
  assert.deepEqual(
    predictCarriers('41801125484912').map((c) => c.id),
    ['HANJIN']
  )
})

test('11자리 숫자는 로젠/경동 후보를 반환한다', () => {
  assert.deepEqual(
    predictCarriers('12345678901').map((c) => c.id),
    ['LOGEN', 'KDEXP']
  )
})

test('EMS 형식(XX#########XX)은 우체국 EMS로 예측한다', () => {
  assert.deepEqual(
    predictCarriers('EE123456789KR').map((c) => c.id),
    ['EPOST_EMS']
  )
  // Lowercase is also accepted by the case-insensitive pattern
  assert.deepEqual(
    predictCarriers('ee123456789kr').map((c) => c.id),
    ['EPOST_EMS']
  )
})

test('영문 포함 12자리는 로젠택배로 예측한다', () => {
  assert.deepEqual(
    predictCarriers('96aborz71319').map((c) => c.id),
    ['LOGEN']
  )
})

test('공백과 하이픈을 제거한 뒤 판별한다', () => {
  assert.deepEqual(
    predictCarriers('4180-1125-4849').map((c) => c.id),
    ['HANJIN', 'CJ', 'LOTTE']
  )
  assert.deepEqual(
    predictCarriers(' 6405 9980 46 ').map((c) => c.id),
    ['CJ']
  )
})

test('예측 결과에 중복 캐리어가 없다', () => {
  const ids = predictCarriers('418011254849').map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('어떤 패턴에도 맞지 않으면 빈 배열을 반환한다', () => {
  assert.deepEqual(predictCarriers('abc'), [])
  assert.deepEqual(predictCarriers('123456789012345'), [])
})
