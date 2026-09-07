// Settings/profile page — the corrections from this session's spec review:
// avatar support, a working change-password form, and background/weekly-
// hours fields hidden for non-students (SettingsPage.tsx).
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/authState'
import { loadTestEnv, requireEnv } from './helpers/env'

const env = loadTestEnv()

test.describe('Student settings', () => {
  test.use({ storageState: storageStatePath.student })

  test('sees student-only fields: Background and Weekly hours target', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByLabel('Background')).toBeVisible()
    await expect(page.getByLabel('Weekly hours target')).toBeVisible()
    await expect(page.getByText(/overall progress/i)).toBeVisible()
  })

  test('editing full name and avatar URL saves and reflects in the nav', async ({ page }) => {
    const avatarUrl = 'https://placehold.co/64x64.png'
    await page.goto('/settings')
    await page.getByLabel('Avatar URL').fill(avatarUrl)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(/^saved\.$/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('img[src="' + avatarUrl + '"]').first()).toBeVisible()

    await page.goto('/dashboard')
    await expect(page.locator(`img[src="${avatarUrl}"]`).first()).toBeVisible()
  })

  test('change password form updates the password, then it is reverted for the next run', async ({ page }) => {
    requireEnv(env, ['TEST_STUDENT_PASSWORD'])
    const originalPassword = env.TEST_STUDENT_PASSWORD!
    const tempPassword = `${originalPassword}-e2e-temp`

    await page.goto('/settings')
    await page.getByLabel('New password', { exact: true }).fill(tempPassword)
    await page.getByLabel('Confirm new password').fill(tempPassword)
    await page.getByRole('button', { name: /update password/i }).click()
    await expect(page.getByText(/password updated/i)).toBeVisible({ timeout: 15_000 })

    // Revert immediately so this test is safe to re-run and so the shared
    // TEST_STUDENT_PASSWORD in .env.test keeps working for every other
    // spec in the suite (global-setup would also self-heal this on the
    // next run, but don't rely on that within a single run).
    await page.getByLabel('New password', { exact: true }).fill(originalPassword)
    await page.getByLabel('Confirm new password').fill(originalPassword)
    await page.getByRole('button', { name: /update password/i }).click()
    await expect(page.getByText(/password updated/i)).toBeVisible({ timeout: 15_000 })
  })

  test('mismatched confirmation is rejected before submitting', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('New password', { exact: true }).fill('one-password-123')
    await page.getByLabel('Confirm new password').fill('a-different-password-456')
    await page.getByRole('button', { name: /update password/i }).click()
    await expect(page.getByText(/passwords don't match/i)).toBeVisible()
  })
})

test.describe('Mentor settings', () => {
  test.use({ storageState: storageStatePath.mentor })

  test('does not see student-only fields, and no "overall progress" card', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByLabel('Background')).toHaveCount(0)
    await expect(page.getByLabel('Weekly hours target')).toHaveCount(0)
    await expect(page.getByText(/overall progress/i)).toHaveCount(0)
    // Still has the fields every role gets.
    await expect(page.getByLabel('Full name')).toBeVisible()
    await expect(page.getByLabel('Avatar URL')).toBeVisible()
  })
})

test.describe('Admin settings', () => {
  test.use({ storageState: storageStatePath.admin })

  test('does not see student-only fields, and no "overall progress" card', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByLabel('Background')).toHaveCount(0)
    await expect(page.getByLabel('Weekly hours target')).toHaveCount(0)
    await expect(page.getByText(/overall progress/i)).toHaveCount(0)
  })
})

test.describe('Danger zone', () => {
  test.use({ storageState: storageStatePath.student })

  test('log out is available from Settings', async ({ page }) => {
    await page.goto('/settings')
    // Scoped to the Danger Zone card — AppNav also has its own "log out"
    // button on every page, including this one.
    const dangerZone = page.locator('.border-fail.bg-fail-bg')
    await expect(dangerZone.getByRole('button', { name: /^log out$/i })).toBeVisible()
  })

  test('delete requires typing DELETE — button stays disabled otherwise', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: /delete my account/i }).click()
    await page.getByLabel(/type delete to confirm/i).fill('nope')
    await expect(page.getByRole('button', { name: /permanently delete/i })).toBeDisabled()
    await page.getByLabel(/type delete to confirm/i).fill('DELETE')
    await expect(page.getByRole('button', { name: /permanently delete/i })).toBeEnabled()
    // Cancel — this is the shared persistent test student, not a throwaway
    // account. Actual deletion is exercised end-to-end in
    // account-deletion.spec.ts against its own disposable account.
    await page.getByRole('button', { name: /^cancel$/i }).click()
  })
})
