import { expect, test } from '@playwright/test'

// Uses the shared authenticated storageState from auth.setup.ts.
// Redesign IA: /products (원본상품), /orders, /orders/dispatch,
// /orders/purchase, /products/stock, /settings, /studio/*.
test.describe('대시보드 주요 페이지', () => {
  test('주문 목록 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: '주문 목록' })).toBeVisible()
  })

  test('원본상품 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: '원본상품' })).toBeVisible()
  })

  test('구 재고 경로는 원본상품으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForURL('**/products')
    await expect(page.getByRole('heading', { name: '원본상품' })).toBeVisible()
  })

  test('재고 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/products/stock')
    await expect(page.getByRole('heading', { name: '재고', exact: true })).toBeVisible()
  })

  test('발송 처리 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/orders/dispatch')
    await expect(page.getByRole('heading', { name: '발송 처리' })).toBeVisible()
  })

  test('공급업체 발주 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/orders/purchase')
    await expect(page.getByRole('heading', { name: '공급업체 발주' })).toBeVisible()
  })

  test('설정 페이지에 마켓 계정 탭이 있다', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '설정', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: '마켓 계정' })).toBeVisible()
  })

  test('AI 인터뷰 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/studio/interview')
    await expect(page.getByRole('heading', { name: 'AI 인터뷰' })).toBeVisible()
  })
})

test.describe('상품 → 마켓 배포 여정', () => {
  test('상품 추가 후 배포 편집 화면까지 도달한다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/products')

    // 상품 추가
    await page.getByRole('button', { name: '상품 추가' }).click()
    const name = `E2E 텀블러 ${Date.now()}`
    await page.getByPlaceholder('스테인리스 텀블러 500ml').fill(name)
    await page.getByPlaceholder('29900').fill('19900')
    await page.getByRole('button', { name: '추가', exact: true }).click()
    await expect(page.getByText('원본상품이 추가되었습니다.')).toBeVisible()

    // 목록에서 행을 클릭해 상세 패널을 연다
    await page.getByRole('cell', { name }).first().click()
    await expect(page.getByRole('link', { name: /마켓 배포 편집/ })).toBeVisible()

    // 배포 편집 화면으로 이동
    await page.getByRole('link', { name: /마켓 배포 편집/ }).click()
    await expect(page.getByRole('heading', { name: '마켓 배포' })).toBeVisible()
    await expect(page.getByText('원본상품', { exact: true }).first()).toBeVisible()
  })
})
