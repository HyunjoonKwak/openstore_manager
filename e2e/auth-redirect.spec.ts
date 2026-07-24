import { expect, test } from '@playwright/test'

// Run without the shared authenticated storageState.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('인증 가드', () => {
  test('비로그인 상태로 대시보드에 접근하면 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: '계정 로그인' })).toBeVisible()
  })
})
