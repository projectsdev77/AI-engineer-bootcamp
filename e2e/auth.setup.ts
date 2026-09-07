// Playwright "setup" project (see playwright.config.ts projects[0]). Runs
// after global-setup provisions the accounts, and before every other spec.
// Logging in through the real /login form — not an API shortcut — means
// this suite also exercises the actual login UI (email/password) for all
// three roles once each, in addition to producing reusable storageState
// for the specs that don't need to re-test login itself.
import { test as setup, expect } from '@playwright/test'
import { loadTestEnv, requireEnv } from './helpers/env'
import { storageStatePath } from './helpers/authState'

const env = loadTestEnv()
requireEnv(env, [
  'TEST_ADMIN_EMAIL',
  'TEST_ADMIN_PASSWORD',
  'TEST_MENTOR_EMAIL',
  'TEST_MENTOR_PASSWORD',
  'TEST_STUDENT_EMAIL',
  'TEST_STUDENT_PASSWORD',
])

async function loginAndSave(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  expectedPath: RegExp,
  savePath: string,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL(expectedPath, { timeout: 20_000 })
  await page.context().storageState({ path: savePath })
}

setup('authenticate as student', async ({ page }) => {
  await loginAndSave(page, env.TEST_STUDENT_EMAIL!, env.TEST_STUDENT_PASSWORD!, /\/dashboard$/, storageStatePath.student)
})

setup('authenticate as mentor', async ({ page }) => {
  await loginAndSave(page, env.TEST_MENTOR_EMAIL!, env.TEST_MENTOR_PASSWORD!, /\/mentor$/, storageStatePath.mentor)
})

setup('authenticate as admin', async ({ page }) => {
  await loginAndSave(page, env.TEST_ADMIN_EMAIL!, env.TEST_ADMIN_PASSWORD!, /\/admin$/, storageStatePath.admin)
})
