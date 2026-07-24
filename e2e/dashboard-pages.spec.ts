import { expect, test } from '@playwright/test'

// Uses the shared authenticated storageState from auth.setup.ts.
test.describe('대시보드 주요 페이지', () => {
  test('주문 관리 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: '주문 관리' })).toBeVisible()
  })

  test('재고 관리 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.getByRole('heading', { name: '재고 관리' })).toBeVisible()
  })

  test('설정 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '설정', exact: true })).toBeVisible()
  })
})
