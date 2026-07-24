import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadEnvFile, requireEnv } from './env'
import { AUTH_SESSION_FILE, AUTH_STATE_FILE, type AuthState } from './paths'

function removeFileIfExists(filePath: string): void {
  fs.rmSync(filePath, { force: true })
}

/**
 * Deletes the throwaway Supabase user created in global-setup. Related
 * rows cascade (auth.users -> public.users -> stores/suppliers/...), so
 * removing the auth user is sufficient. Always runs, even on test failure.
 */
export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(AUTH_STATE_FILE)) {
    // Setup never created a user; nothing to clean up.
    removeFileIfExists(AUTH_SESSION_FILE)
    return
  }

  try {
    const authState = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf8')) as AuthState
    const env = loadEnvFile()
    const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await admin.auth.admin.deleteUser(authState.userId)
    if (error) {
      // Keep .auth-state.json so the orphaned user id is not lost.
      throw new Error(`Failed to delete E2E test user ${authState.userId}: ${error.message}`)
    }

    removeFileIfExists(AUTH_STATE_FILE)
  } finally {
    removeFileIfExists(AUTH_SESSION_FILE)
  }
}
