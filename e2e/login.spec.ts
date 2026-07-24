import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { submitLogin } from './helpers'
import { AUTH_STATE_FILE, type AuthState } from './paths'

// These specs exercise the unauthenticated login flow.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('로그인 페이지', () => {
  test('로그인 폼이 렌더링된다', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '계정 로그인' })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeEnabled()
  })

  test('잘못된 비밀번호로 로그인하면 오류가 표시된다', async ({ page }) => {
    const authState = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf8')) as AuthState

    await submitLogin(page, authState.email, 'definitely-wrong-password-1!')

    // Supabase rejects the credentials and the page surfaces a toast error.
    await expect(page.locator('[data-sonner-toast]')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
