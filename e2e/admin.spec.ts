// Admin console: overview stats, curriculum CRUD, students list + mentor
// reassignment + manual unlock, broken links, and the certificate editor.
// Session correction covered elsewhere (rbac.spec.ts): admins can no
// longer evaluate submissions and have no exception-queue tab/route.
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/authState'
import { upsertAuthUser, setProfileRole, supabaseAdmin } from './helpers/supabaseAdmin'

test.use({ storageState: storageStatePath.admin })

test.describe('Overview', () => {
  test('shows student/mentor/week/broken-link stat tiles, no "open exceptions" tile', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Students', { exact: true })).toBeVisible()
    await expect(page.getByText('Mentors', { exact: true })).toBeVisible()
    await expect(page.getByText('Published weeks', { exact: true })).toBeVisible()
    await expect(page.getByText('Draft weeks', { exact: true })).toBeVisible()
    await expect(page.getByText('Broken links', { exact: true })).toBeVisible()
    await expect(page.getByText(/open exceptions/i)).toHaveCount(0)
  })
})

test.describe('Curriculum CRUD', () => {
  test('add a week, toggle its publish state, then delete it', async ({ page }) => {
    const title = `E2E Temp Week ${Date.now()}`
    await page.goto('/admin/curriculum')
    await expect(page.getByRole('heading', { name: /^curriculum$/i })).toBeVisible()

    await page.getByPlaceholder(/new week title/i).fill(title)
    await page.getByRole('button', { name: /add week/i }).click()
    const row = page.locator('tr', { hasText: title })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText('draft', { exact: true })).toBeVisible()

    await row.getByText('draft', { exact: true }).click()
    await expect(row.getByText('published', { exact: true })).toBeVisible({ timeout: 15_000 })

    page.once('dialog', (dialog) => dialog.accept())
    await row.getByText('del', { exact: true }).click()
    await expect(page.locator('tr', { hasText: title })).toHaveCount(0, { timeout: 15_000 })
  })

  test('opening a week goes to its editor', async ({ page }) => {
    await page.goto('/admin/curriculum')
    const firstWeekLink = page.locator('table a').first()
    await firstWeekLink.click()
    await expect(page).toHaveURL(/\/admin\/curriculum\/weeks\//)
  })
})

test.describe('Students', () => {
  test('search filters the list', async ({ page }) => {
    await page.goto('/admin/students')
    await expect(page.getByText('E2E Test Student')).toBeVisible()
    await page.getByPlaceholder(/search students/i).fill('this student definitely does not exist zzz')
    await expect(page.getByText(/no students found/i)).toBeVisible()
    await page.getByPlaceholder(/search students/i).fill('E2E Test Student')
    await expect(page.getByText('E2E Test Student')).toBeVisible()
  })

  test('mentor reassignment and manual week unlock, on a disposable student/mentor pair', async ({ page }) => {
    test.setTimeout(60_000)
    const ts = Date.now()
    const studentEmail = `e2e+admin-student-${ts}@example.com`
    const mentorEmail = `e2e+admin-mentor-${ts}@example.com`
    const studentId = await upsertAuthUser(studentEmail, 'a-strong-password-123', 'E2E Reassign Student')
    const mentorId = await upsertAuthUser(mentorEmail, 'a-strong-password-123', 'E2E Reassign Mentor')
    await setProfileRole(mentorId, 'mentor', 'E2E Reassign Mentor')

    try {
      await page.goto(`/admin/students/${studentId}`)
      await page.getByLabel(/assigned mentor/i).selectOption({ label: 'E2E Reassign Mentor' })
      await expect(page.getByLabel(/assigned mentor/i)).toHaveValue(mentorId, { timeout: 15_000 })

      const lockedWeekSelect = page.locator('select').filter({ hasText: /select a locked week/i })
      const hasLockedWeek = (await lockedWeekSelect.count()) > 0 && (await lockedWeekSelect.locator('option').count()) > 1
      test.skip(!hasLockedWeek, 'Student has no locked week to manually unlock (only one seeded week, or already unlocked all).')

      await lockedWeekSelect.selectOption({ index: 1 })
      await page.getByPlaceholder(/reason \(required\)/i).fill('E2E: verifying manual unlock UI')
      await page.getByRole('button', { name: /^unlock$/i }).click()
      // The form resets its own fields on success (unlockWeekId/unlockReason -> '').
      await expect(lockedWeekSelect).toHaveValue('', { timeout: 15_000 })

      const { data, error } = await supabaseAdmin()
        .from('week_unlocks')
        .select('id')
        .eq('user_id', studentId)
        .eq('unlocked_by', 'admin')
      if (error) throw error
      expect(data!.length).toBeGreaterThan(0)
    } finally {
      await supabaseAdmin().auth.admin.deleteUser(studentId)
      await supabaseAdmin().auth.admin.deleteUser(mentorId)
    }
  })
})

test.describe('Broken links', () => {
  test('loads, and "mark fixed" clears a flagged resource if any are present', async ({ page }) => {
    await page.goto('/admin/broken-links')
    await expect(page.getByRole('heading', { name: /broken links/i })).toBeVisible()
    const allClear = page.getByText(/all clear/i)
    const rows = page.locator('tbody tr')
    if (await allClear.isVisible().catch(() => false)) {
      return
    }
    const rowCount = await rows.count()
    test.skip(rowCount === 0, 'No broken links currently flagged.')
    const firstRowText = await rows.first().locator('p').first().innerText()
    await rows.first().getByRole('button', { name: /mark fixed/i }).click()
    await expect(page.locator('tbody tr', { hasText: firstRowText })).toHaveCount(0, { timeout: 15_000 })
  })
})

test.describe('Certificate editor', () => {
  test('loads the template form (or offers to create a default one)', async ({ page }) => {
    await page.goto('/admin/certificate')
    await expect(page.getByRole('heading', { name: /certificate template/i })).toBeVisible()
    const createDefault = page.getByRole('button', { name: /create default template/i })
    if (await createDefault.isVisible().catch(() => false)) {
      await createDefault.click()
    }
    await expect(page.getByLabel('Title', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/live preview/i)).toBeVisible()
  })
})
