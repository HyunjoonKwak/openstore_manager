import type { SyncRunRow } from '@/types/redesign.types'

// Pure sync-run bookkeeping shared by the engine (server-only) and unit
// tests: outcome shape, caller options and the sync_runs row mapping.

export interface SyncOutcome {
  success: boolean
  processed: number
  failed: number
  error: string | null
}

export interface SyncRunOptions {
  // Set by the cron route so the automation tab can tell scheduled runs
  // from manual ones and group them per schedule; manual callers omit it.
  scheduleId?: string | null
}

export interface SyncRunRecordParams {
  marketAccountId: string
  scheduleId?: string | null
  syncType: string
  direction: 'pull' | 'push'
  outcome: SyncOutcome
  startedAt: string
}

export type SyncRunInsert = Omit<SyncRunRow, 'id'>

// Pure mapping from an outcome to the sync_runs row, kept separate from the
// insert so the status/trigger rules are unit-testable without a database.
export function buildSyncRunRow(
  params: SyncRunRecordParams,
  completedAt: string = new Date().toISOString(),
): SyncRunInsert {
  return {
    schedule_id: params.scheduleId ?? null,
    market_account_id: params.marketAccountId,
    sync_type: params.syncType,
    direction: params.direction,
    status: params.outcome.success
      ? params.outcome.failed > 0
        ? 'partial'
        : 'completed'
      : 'failed',
    items_processed: params.outcome.processed,
    items_failed: params.outcome.failed,
    error_message: params.outcome.error,
    started_at: params.startedAt,
    completed_at: completedAt,
  }
}
