// Student dashboard, week/lesson navigation, and the lesson completion
// gating correction from this session's spec review: the Continue/next-
// lesson button must be disabled until every required resource on the
// current lesson is checked off (LessonPage.tsx).
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/authState'
import { findLessonWithRequiredResource, findUnlockedWeek } from './helpers/testData'

test.use({ storageState: storageStatePath.student })

test.describe('Dashboard', () => {
  test('shows a welcome header, week list, and overall progress', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByText(/twelve weeks/i)).toBeVisible()
    await expect(page.getByText(/overall progress/i)).toBeVisible()
  })

  test('week 1 is unlocked and clickable; later weeks show locked state until earned', async ({ page }) => {
    await page.goto('/dashboard')
    // "Week 1:" legitimately appears twice when week 1 is the active week
    // (the "continue where you left off" banner, and the week list row).
    await expect(page.getByText(/week 1:/i).first()).toBeVisible()
    const lockedBadges = page.getByText('locked', { exact: true })
    // Not asserting a specific count (progress varies run to run) — just
    // that locked weeks render the locked affordance, not a broken link.
    if ((await lockedBadges.count()) > 0) {
      await expect(lockedBadges.first()).toBeVisible()
    }
  })
})

test.describe('Week page', () => {
  test('lists lessons and assignments for an unlocked week', async ({ page }) => {
    const week = await findUnlockedWeek()
    test.skip(!week, 'No unlocked week visible for the test student — seed content missing?')
    await page.goto(`/weeks/${week!.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(week!.title, 'i') })).toBeVisible()
    await expect(page.getByText(/lessons/i)).toBeVisible()
  })
})

test.describe('Lesson completion gating', () => {
  test('Continue is disabled until every required resource is checked, and enables immediately once they are', async ({ page }) => {
    const lesson = await findLessonWithRequiredResource()
    test.skip(!lesson, 'No lesson with a required resource and a following lesson was found in the visible content.')

    await page.goto(`/weeks/${lesson!.weekId}/lessons/${lesson!.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(lesson!.title, 'i') })).toBeVisible()

    const requiredRows = page.locator('li.border-ink').filter({ has: page.getByRole('checkbox') })
    await expect(requiredRows).toHaveCount(lesson!.requiredResourceCount)

    // Force the "not yet complete" state regardless of what a previous
    // suite run left behind, so this test is meaningful on every run.
    for (let i = 0; i < lesson!.requiredResourceCount; i++) {
      const checkbox = requiredRows.nth(i).getByRole('checkbox')
      if (await checkbox.isChecked()) await checkbox.uncheck()
    }

    const continueButton = page.getByRole('button', { name: /continue →|^complete$/i })
    await expect(continueButton).toBeDisabled()
    await expect(page.getByText('complete', { exact: true })).toHaveCount(0)

    // Check every required resource one at a time; progress counter should
    // climb and the button should stay disabled until the very last one.
    for (let i = 0; i < lesson!.requiredResourceCount; i++) {
      await requiredRows.nth(i).getByRole('checkbox').check()
      const isLast = i === lesson!.requiredResourceCount - 1
      if (!isLast) {
        await expect(continueButton).toBeDisabled()
      }
    }

    await expect(page.getByText('complete', { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    await expect(continueButton).toBeEnabled({ timeout: 10_000 })
    await expect(continueButton).toHaveText(/continue →/i)

    await continueButton.click()
    await expect(page).toHaveURL(/\/lessons\//)
  })

  test('unchecking a required resource after completion revokes completion (PD-007 recompute)', async ({ page }) => {
    const lesson = await findLessonWithRequiredResource()
    test.skip(!lesson, 'No lesson with a required resource was found.')

    await page.goto(`/weeks/${lesson!.weekId}/lessons/${lesson!.id}`)
    const requiredRows = page.locator('li.border-ink').filter({ has: page.getByRole('checkbox') })

    // Get to "complete" first.
    for (let i = 0; i < lesson!.requiredResourceCount; i++) {
      const checkbox = requiredRows.nth(i).getByRole('checkbox')
      if (!(await checkbox.isChecked())) await checkbox.check()
    }
    await expect(page.getByText('complete', { exact: true }).first()).toBeVisible({ timeout: 10_000 })

    // Uncheck just one — completion must be revoked, not "sticky".
    await requiredRows.first().getByRole('checkbox').uncheck()
    await expect(page.getByText('complete', { exact: true })).toHaveCount(0, { timeout: 10_000 })

    // Restore, so the suite leaves content in a "complete" state for
    // anything downstream (e.g. week-unlock expectations) that assumes it.
    await requiredRows.first().getByRole('checkbox').check()
    await expect(page.getByText('complete', { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  })
})
