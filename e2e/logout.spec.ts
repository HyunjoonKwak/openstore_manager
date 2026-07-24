import { expect, test } from '@playwright/test'

// Runs last (alphabetical order, single worker) because signing out
// revokes the shared Supabase session used by the authenticated specs.
test.describe('로그아웃', () => {
  test('로그아웃하면 로그인 페이지로 이동하고 세션이 종료된다', async ({ page }) => {
    await page.goto('/settings')

    // The settings page shows a loading state before the content renders.
    await page.getByRole('button', { name: '로그아웃' }).click()
    await page.waitForURL('**/login')

    // The session is gone: protected routes bounce back to /login.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
