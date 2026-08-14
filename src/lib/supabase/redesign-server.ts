import 'server-only'

import { createClient as createBaseClient } from './server'
import type { RedesignClient } from '@/types/redesign.types'

/**
 * Server client typed against the redesign schema (migrations 100/110).
 * The legacy Database type in database.types.ts still serves the old
 * actions; this cast bridges until typegen runs against the restored
 * project and the two type files merge.
 */
export async function createRedesignClient(): Promise<RedesignClient> {
  return (await createBaseClient()) as unknown as RedesignClient
}
