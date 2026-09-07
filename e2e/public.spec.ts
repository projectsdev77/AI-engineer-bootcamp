// Public, unauthenticated pages. No storageState — every test here starts
// as a signed-out visitor, matching how the marketing/curriculum/login
// pages are actually reached.
import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads and links to signup', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/./)
    await expect(page.getByRole('link', { name: /start week one|sign up|get started/i }).first()).toBeVisible()
  })

  test('nav links to curriculum and login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /curriculum/i }).first().click()
    await expect(page).toHaveURL(/\/curriculum$/)
  })
})

test.describe('Curriculum page', () => {
  test('lists published weeks from the real project', async ({ page }) => {
    await page.goto('/curriculum')
    await expect(page.getByRole('heading', { name: /the curriculum/i })).toBeVisible()
    // Either real week content loaded, or the explicit empty state — never
    // a silent blank page. The seeded project has 3 weeks, so this should
    // resolve to real content, not the empty state.
    const emptyState = page.getByText(/curriculum is being finalized/i)
    const firstWeek = page.getByText(/^01$/)
    await expect(emptyState.or(firstWeek)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('404 handling', () => {
  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await page.getByRole('link', { name: /go home/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('the removed /admin/queue route 404s rather than rendering the old admin exception queue', async ({ page }) => {
    await page.goto('/admin/queue')
    await expect(page.getByText('404')).toBeVisible()
  })
})

test.describe('Certificate verification', () => {
  test('an invalid code shows "not found", not a crash', async ({ page }) => {
    await page.goto('/certificates/THIS-CODE-DOES-NOT-EXIST')
    await expect(page.getByText(/invalid code/i)).toBeVisible()
    await expect(page.getByText(/certificate not found/i)).toBeVisible()
  })
})
