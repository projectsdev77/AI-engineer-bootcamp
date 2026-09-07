// Cross-role access control. Each test.describe uses the storageState
// produced by auth.setup.ts for that role — real sessions against the
// real project, not mocked auth.
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/authState'

test.describe('Student role boundaries', () => {
  test.use({ storageState: storageStatePath.student })

  test('cannot reach /mentor — bounced to /dashboard', async ({ page }) => {
    await page.goto('/mentor')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('cannot reach /admin — bounced to /dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('cannot reach /mentor/queue — bounced to /dashboard', async ({ page }) => {
    await page.goto('/mentor/queue')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('AppNav shows no mentor/admin affordances', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /your students/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^admin$/i })).toHaveCount(0)
  })
})

test.describe('Mentor role boundaries', () => {
  test.use({ storageState: storageStatePath.mentor })

  test('cannot reach /admin — ultimately lands on /mentor, not the admin console', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/mentor$/)
    await expect(page.getByRole('heading', { name: /admin overview/i })).toHaveCount(0)
  })

  test('landing on /dashboard bounces to /mentor', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/mentor$/)
  })

  test('can reach /mentor and /mentor/queue', async ({ page }) => {
    await page.goto('/mentor')
    await expect(page.getByRole('heading', { name: /your students/i })).toBeVisible()
    await page.goto('/mentor/queue')
    await expect(page.getByRole('heading', { name: /exception queue/i })).toBeVisible()
  })

  test('AppNav shows the Mentor badge and "your students" link, no admin link', async ({ page }) => {
    await page.goto('/mentor')
    await expect(page.getByText('Mentor', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /your students/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^admin$/i })).toHaveCount(0)
  })
})

test.describe('Admin role boundaries', () => {
  test.use({ storageState: storageStatePath.admin })

  test('cannot reach mentor-only /mentor — bounced to /admin', async ({ page }) => {
    await page.goto('/mentor')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('cannot reach mentor-only /mentor/queue — bounced to /admin', async ({ page }) => {
    await page.goto('/mentor/queue')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('landing on /dashboard bounces to /admin', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('can reach every /admin/* subpage', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /admin overview/i })).toBeVisible()
    for (const path of ['/admin/curriculum', '/admin/students', '/admin/broken-links', '/admin/certificate']) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
    }
  })

  test('AppNav shows the Admin badge and admin link (regression: this link was previously dropped)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Admin', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /^admin$/i })).toBeVisible()
  })

  test('AdminNav has no "exception queue" / evaluation tab — admin no longer evaluates submissions', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: /queue/i })).toHaveCount(0)
  })
})

test.describe('Unauthenticated visitor', () => {
  test('every protected route redirects to /login', async ({ page }) => {
    for (const path of ['/dashboard', '/settings', '/mentor', '/mentor/queue', '/admin', '/admin/students']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    }
  })
})
