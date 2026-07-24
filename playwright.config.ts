import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const authSessionFile = path.join(configDir, 'e2e', '.auth-session.json')

export default defineConfig({
  testDir: 'e2e',
  // Run serially: specs share one throwaway Supabase user, and the logout
  // spec (alphabetically last) revokes the shared session when it runs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3105',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      // Logs in through the UI once and persists storageState for the
      // authenticated specs (Playwright setup-project pattern).
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authSessionFile,
      },
    },
  ],
  webServer: {
    // Production server; the orchestrator guarantees a fresh build exists.
    command: 'PORT=3105 npm run start',
    url: 'http://localhost:3105/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
