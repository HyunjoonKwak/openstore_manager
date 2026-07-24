import { expect, type Page } from '@playwright/test'

/**
 * Waits until the login page is hydrated. The inputs are React-controlled:
 * values typed before hydration are wiped by the first client render, so we
 * probe the password visibility toggle, which only reacts once React event
 * handlers are attached.
 */
export async function waitForLoginPageReady(page: Page): Promise<void> {
  const passwordInput = page.locator('#password')
  await expect(passwordInput).toBeVisible()

  await expect(async () => {
    await page.getByRole('button', { name: '비밀번호 보기' }).click({ timeout: 2_000 })
    await expect(passwordInput).toHaveAttribute('type', 'text', { timeout: 1_000 })
  }).toPass({ timeout: 20_000 })

  // Restore the masked state before the actual test interaction.
  await page.getByRole('button', { name: '비밀번호 숨기기' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'password')
}

/** Fills the login form and submits it. */
export async function submitLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await waitForLoginPageReady(page)

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
}
