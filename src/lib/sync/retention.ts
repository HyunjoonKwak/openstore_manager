// Retention rule for sync_runs. Every scheduled tick writes one row per sync
// type, so a single hourly "both" schedule adds ~1,400 rows a month; without
// pruning the table grows without bound. Kept pure so the cutoff math is
// unit-testable and the cron route only performs the delete.

export const SYNC_RUN_RETENTION_DAYS = 90

export function syncRunRetentionCutoff(
  now: Date = new Date(),
  retentionDays: number = SYNC_RUN_RETENTION_DAYS,
): string {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error('retentionDays must be a positive number')
  }
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
}
