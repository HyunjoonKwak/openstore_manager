import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isScheduleDue, minutesOfDay } from '../src/lib/sync/due.ts'

const base = {
  is_enabled: true,
  interval_minutes: 60,
  sync_time: null as string | null,
  last_sync_at: null as string | null,
}

function at(iso: string) {
  return { now: new Date(iso) }
}

test('disabled schedule never runs', () => {
  assert.equal(isScheduleDue({ ...base, is_enabled: false }, at('2026-08-20T00:00:00Z')), false)
})

test('never-run schedule is due immediately', () => {
  assert.equal(isScheduleDue(base, at('2026-08-20T00:00:00Z')), true)
})

test('interval schedule waits for the interval to elapse', () => {
  const lastRun = { ...base, interval_minutes: 60, last_sync_at: '2026-08-20T00:00:00Z' }
  assert.equal(isScheduleDue(lastRun, at('2026-08-20T00:30:00Z')), false)
  assert.equal(isScheduleDue(lastRun, at('2026-08-20T01:00:00Z')), true)
})

test('a tick arriving seconds early still fires', () => {
  const lastRun = { ...base, interval_minutes: 60, last_sync_at: '2026-08-20T00:00:00Z' }
  assert.equal(isScheduleDue(lastRun, at('2026-08-20T00:59:40Z')), true)
})

test('daily schedule fires inside its wall-clock window (KST)', () => {
  const daily = { ...base, interval_minutes: 1440, sync_time: '09:00', last_sync_at: null }
  // 00:05 UTC = 09:05 KST → inside the window
  assert.equal(isScheduleDue(daily, at('2026-08-20T00:05:00Z')), true)
  // 03:00 UTC = 12:00 KST → outside
  assert.equal(isScheduleDue(daily, at('2026-08-20T03:00:00Z')), false)
})

test('daily schedule does not fire twice in the same window', () => {
  const daily = {
    ...base,
    interval_minutes: 1440,
    sync_time: '09:00',
    last_sync_at: '2026-08-20T00:01:00Z', // 09:01 KST, just ran
  }
  assert.equal(isScheduleDue(daily, at('2026-08-20T00:05:00Z')), false)
  // next day inside the window again
  assert.equal(isScheduleDue(daily, at('2026-08-21T00:02:00Z')), true)
})

test('daily schedule with malformed time never fires', () => {
  const broken = { ...base, interval_minutes: 1440, sync_time: 'noon' }
  assert.equal(isScheduleDue(broken, at('2026-08-20T00:05:00Z')), false)
})

test('minutesOfDay converts to the target zone', () => {
  assert.equal(minutesOfDay(new Date('2026-08-20T00:00:00Z'), 'Asia/Seoul'), 9 * 60)
  assert.equal(minutesOfDay(new Date('2026-08-20T00:00:00Z'), 'UTC'), 0)
})
