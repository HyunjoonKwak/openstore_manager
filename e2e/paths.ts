import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

/** Credentials of the throwaway Supabase user created in global setup. */
export const AUTH_STATE_FILE = path.join(currentDir, '.auth-state.json')

/** Playwright storageState captured by auth.setup.ts after a UI login. */
export const AUTH_SESSION_FILE = path.join(currentDir, '.auth-session.json')

export interface AuthState {
  email: string
  password: string
  userId: string
}
