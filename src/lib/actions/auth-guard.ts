import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Ensures an authenticated user session exists on the given Supabase client.
 * Throws when there is no active session so each caller can map the failure
 * to its own error-return shape.
 */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('Unauthorized: login required')
  }

  return data.user
}
