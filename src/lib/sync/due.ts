import type { SyncScheduleRow } from '@/types/redesign.types'

// Pure due-time logic for schedule execution. Extracted so the cron
// route stays thin and the rule is unit-testable: a daily schedule
// fires at its wall-clock time, an interval schedule fires once its
// interval has elapsed since the last run.

const DAILY_INTERVAL_MINUTES = 1440

export interface DueOptions {
  /** Evaluation moment (injected for tests). */
  now: Date
  /**
   * Grace window in minutes for daily schedules — the cron tick that
   * lands just after the target time still counts as on time.
   */
  windowMinutes?: number
  /** IANA zone the wall-clock time is expressed in. */
  timeZone?: string
}

/** Wall-clock minutes-since-midnight of `now` in the given zone. */
export function minutesOfDay(now: Date, timeZone = 'Asia/Seoul'): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function parseHhMm(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function isScheduleDue(
  schedule: Pick<
    SyncScheduleRow,
    'is_enabled' | 'interval_minutes' | 'sync_time' | 'last_sync_at'
  >,
  options: DueOptions
): boolean {
  if (!schedule.is_enabled) return false

  const { now, windowMinutes = 10, timeZone = 'Asia/Seoul' } = options
  const lastRun = schedule.last_sync_at ? new Date(schedule.last_sync_at) : null
  const minutesSinceLastRun = lastRun
    ? (now.getTime() - lastRun.getTime()) / 60_000
    : Number.POSITIVE_INFINITY

  // Daily schedule pinned to a wall-clock time
  if (schedule.interval_minutes >= DAILY_INTERVAL_MINUTES && schedule.sync_time) {
    const target = parseHhMm(schedule.sync_time)
    if (target === null) return false
    const current = minutesOfDay(now, timeZone)
    const insideWindow = current >= target && current < target + windowMinutes
    // Guard against firing twice inside the same window
    return insideWindow && minutesSinceLastRun >= windowMinutes
  }

  // Interval schedule: fire once the interval has elapsed. A small
  // tolerance keeps a tick that arrives seconds early from skipping.
  return minutesSinceLastRun >= schedule.interval_minutes - 0.5
}
