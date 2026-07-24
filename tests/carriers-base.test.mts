import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CarrierScraper } from '../src/lib/carriers/base.ts'
import type { TrackEvent, TrackEventStatusCode, TrackInfo } from '../src/lib/carriers/types.ts'

// Test double exposing the protected pure helpers of CarrierScraper
class TestScraper extends CarrierScraper {
  readonly carrierId = 'TEST'
  readonly carrierName = '테스트택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    return this.createSuccessResult(trackingNumber, [])
  }

  parse(
    dateStr: string | null,
    timeStr: string | null,
    format?: 'iso' | 'korean' | 'korean-dot' | 'compact'
  ): string | null {
    return format === undefined
      ? this.parseDateTime(dateStr, timeStr)
      : this.parseDateTime(dateStr, timeStr, format)
  }

  event(
    statusCode: TrackEventStatusCode,
    statusName: string | null,
    time: string | null,
    location: string | null,
    description: string | null
  ): TrackEvent {
    return this.createEvent(statusCode, statusName, time, location, description)
  }

  success(
    trackingNumber: string,
    events: TrackEvent[],
    sender: { name: string | null; address?: string | null } | null = null,
    recipient: { name: string | null; address?: string | null } | null = null,
    productName: string | null = null
  ): TrackInfo {
    return this.createSuccessResult(trackingNumber, events, sender, recipient, productName)
  }

  failure(trackingNumber: string, error: string): TrackInfo {
    return this.createErrorResult(trackingNumber, error)
  }
}

const scraper = new TestScraper()

// Expected values are built with the same local-time Date constructor,
// so assertions hold regardless of the machine's timezone.
const localIso = (
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
  s = 0
): string => new Date(y, m - 1, d, h, min, s).toISOString()

test('korean 형식(YYYY-MM-DD + HH:mm)을 ISO 문자열로 변환한다', () => {
  assert.equal(scraper.parse('2024-01-15', '14:30', 'korean'), localIso(2024, 1, 15, 14, 30))
})

test('korean 형식은 기본 포맷으로 사용된다', () => {
  assert.equal(scraper.parse('2024-01-15', '14:30'), localIso(2024, 1, 15, 14, 30))
})

test('시간이 없으면 자정으로 처리한다', () => {
  assert.equal(scraper.parse('2024-01-15', null, 'korean'), localIso(2024, 1, 15))
})

test('korean-dot 형식(YYYY.MM.DD)을 변환한다', () => {
  assert.equal(scraper.parse('2024.03.05', '09:05', 'korean-dot'), localIso(2024, 3, 5, 9, 5))
  assert.equal(scraper.parse('2024.03.05', null, 'korean-dot'), localIso(2024, 3, 5))
})

test('compact 형식(YYYYMMDD + HHmmss)을 초 단위까지 변환한다', () => {
  assert.equal(
    scraper.parse('20240115', '143025', 'compact'),
    localIso(2024, 1, 15, 14, 30, 25)
  )
  assert.equal(scraper.parse('20240115', null, 'compact'), localIso(2024, 1, 15))
})

test('iso 형식은 그대로 파싱해 ISO 문자열을 반환한다', () => {
  assert.equal(scraper.parse('2024-01-15T05:30:00Z', null, 'iso'), '2024-01-15T05:30:00.000Z')
})

test('날짜가 null이면 null을 반환한다', () => {
  assert.equal(scraper.parse(null, '14:30', 'korean'), null)
})

test('형식에 맞지 않는 날짜 문자열은 null을 반환한다', () => {
  assert.equal(scraper.parse('01/15/2024', '14:30', 'korean'), null)
  assert.equal(scraper.parse('2024-01-15', null, 'korean-dot'), null)
  assert.equal(scraper.parse('not-a-date', null, 'iso'), null)
})

test('createEvent는 상태/시간/위치/설명을 담은 이벤트를 만든다', () => {
  const event = scraper.event('DELIVERED', '배송완료', '2024-01-15T05:30:00.000Z', '서울', '문 앞')
  assert.deepEqual(event, {
    status: { code: 'DELIVERED', name: '배송완료' },
    time: '2024-01-15T05:30:00.000Z',
    location: '서울',
    description: '문 앞',
  })
})

test('createSuccessResult는 성공 결과와 캐리어 정보를 포함한다', () => {
  const event = scraper.event('IN_TRANSIT', '이동중', null, null, null)
  const result = scraper.success('1234567890', [event], { name: '보내는이' }, { name: '받는이' }, '상품명')

  assert.equal(result.success, true)
  assert.deepEqual(result.carrier, { id: 'TEST', name: '테스트택배' })
  assert.equal(result.trackingNumber, '1234567890')
  assert.deepEqual(result.sender, { name: '보내는이' })
  assert.deepEqual(result.recipient, { name: '받는이' })
  assert.equal(result.productName, '상품명')
  assert.deepEqual(result.events, [event])
})

test('createSuccessResult의 선택 인자는 기본값 null을 가진다', () => {
  const result = scraper.success('1234567890', [])
  assert.equal(result.sender, null)
  assert.equal(result.recipient, null)
  assert.equal(result.productName, null)
})

test('createErrorResult는 실패 결과와 에러 메시지를 포함한다', () => {
  const result = scraper.failure('0000000000', '조회 결과가 없습니다.')

  assert.equal(result.success, false)
  assert.deepEqual(result.carrier, { id: 'TEST', name: '테스트택배' })
  assert.equal(result.trackingNumber, '0000000000')
  assert.equal(result.error, '조회 결과가 없습니다.')
  assert.deepEqual(result.events, [])
  assert.equal(result.sender, null)
  assert.equal(result.recipient, null)
})
