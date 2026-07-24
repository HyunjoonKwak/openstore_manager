import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadEnvFile, requireEnv } from './env'
import { AUTH_STATE_FILE, type AuthState } from './paths'

/**
 * Creates a dedicated throwaway Supabase user for the E2E run via the
 * admin API and stores its credentials for the specs. The matching
 * global-teardown deletes the user (public.users has ON DELETE CASCADE
 * from auth.users, and stores/suppliers cascade from public.users, so
 * deleting the auth user removes every row it created).
 */
export default async function globalSetup(): Promise<void> {
  const env = loadEnvFile()
  const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `e2e-test+${Date.now()}@example.com`
  const password = `E2e!${crypto.randomBytes(12).toString('base64url')}`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`Failed to create E2E test user: ${error?.message ?? 'unknown error'}`)
  }

  const authState: AuthState = { email, password, userId: data.user.id }
  fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(authState, null, 2), 'utf8')
}
