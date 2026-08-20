/**
 * Spend cap bounds. Kept out of the 'use server' action module, which may
 * only export async functions, so the client and the server action share
 * one definition instead of drifting apart.
 */

/** Mirrors the CHECK constraint in migration 120. */
export const MAX_LIMIT_KRW = 100_000

export const DEFAULT_LIMIT_KRW = 3_000

/** Quick-pick values in the settings UI. 0 disables AI entirely. */
export const LIMIT_PRESETS = [0, 3_000, 10_000, 30_000] as const
