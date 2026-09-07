import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv } from './e2e/helpers/env'

const env = loadTestEnv()
const PORT = env.PLAYWRIGHT_PORT ?? '4173'
const baseURL = env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`
// Only Playwright's own preview server (localhost, no PLAYWRIGHT_BASE_URL
// override) gets auto-started. Point PLAYWRIGHT_BASE_URL at a deployed
// (e.g. Vercel) URL to run the same suite against production instead —
// in that case nothing here starts a server, Playwright just hits it.
const isLocalDefault = !env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  // AI grading (Gemini) and some backend triggers are real network calls
  // against the live project — give them room instead of flaking.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // shared live Supabase project + rate limits: run serially
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: isLocalDefault
    ? {
        // Vite dev server, not a production build: fastest to boot, and it
        // reads the same .env this suite already needs (VITE_SUPABASE_URL /
        // VITE_SUPABASE_ANON_KEY) so the app under test talks to the same
        // real project the setup script provisions accounts against.
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
})
