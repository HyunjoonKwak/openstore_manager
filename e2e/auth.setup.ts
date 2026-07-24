import fs from 'node:fs'
import { expect, test as setup } from '@playwright/test'
import { submitLogin } from './helpers'
import { AUTH_SESSION_FILE, AUTH_STATE_FILE, type AuthState } from './paths'

/**
 * Setup project: logs in through the real UI with the throwaway user
 * created in global-setup, verifies the redirect to the dashboard, and
 * persists the storageState reused by all authenticated specs.
 * This also covers the "successful login redirects to dashboard" flow.
 */
setup('로그인 성공 시 대시보드로 이동한다', async ({ page }) => {
  const authState = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf8')) as AuthState

  await submitLogin(page, authState.email, authState.password)

  await page.waitForURL('**/dashboard')
  await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

  await page.context().storageState({ path: AUTH_SESSION_FILE })
})
