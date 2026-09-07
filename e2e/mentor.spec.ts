// Mentor-facing pages: assigned students list, student detail (progress +
// messaging), and the exception queue — which is mentor-only as of this
// session's correction (admins no longer evaluate submissions; see
// supabase/migrations/20250101000017_admin_no_longer_evaluates.sql and
// src/pages/shared/ExceptionQueuePage.tsx).
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/authState'
import { loadTestEnv, requireEnv } from './helpers/env'
import { upsertAuthUser, supabaseAdmin } from './helpers/supabaseAdmin'
import { findAssignmentByType, quizCorrectAnswers } from './helpers/testData'

const env = loadTestEnv()

test.describe('Assigned students', () => {
  test.use({ storageState: storageStatePath.mentor })

  test('lists the linked test student, and their detail page loads progress + messaging', async ({ page }) => {
    requireEnv(env, ['E2E_STUDENT_ID'])
    await page.goto('/mentor')
    await expect(page.getByRole('heading', { name: /your students/i })).toBeVisible()
    await expect(page.getByText('E2E Test Student')).toBeVisible()

    await page.getByRole('link', { name: /view →/i }).first().click()
    await expect(page).toHaveURL(/\/mentor\/students\//)
    await expect(page.getByText(/overall progress/i)).toBeVisible()
    await expect(page.getByText(/recent submissions/i)).toBeVisible()
    // "Messages" (the section header) vs. "No messages yet — say hello."
    // (the empty state) both match a loose /messages/i — the header alone
    // is enough to confirm the section rendered.
    await expect(page.getByText('Messages', { exact: true })).toBeVisible()
  })

  test('sending a message appears in the thread immediately', async ({ page }) => {
    requireEnv(env, ['E2E_STUDENT_ID'])
    await page.goto(`/mentor/students/${process.env.E2E_STUDENT_ID}`)
    const body = `E2E ping ${Date.now()}`
    await page.getByPlaceholder(/write a message/i).fill(body)
    await page.getByRole('button', { name: /^send$/i }).click()
    await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Exception queue', () => {
  test.use({ storageState: storageStatePath.mentor })

  test('tabs switch between "needs attention" and "resolved"', async ({ page }) => {
    await page.goto('/mentor/queue')
    await expect(page.getByRole('heading', { name: /exception queue/i })).toBeVisible()
    await page.getByRole('button', { name: /needs attention/i }).click()
    await page.getByRole('button', { name: /^resolved/i }).click()
  })

  test('a flagged submission from an assigned student appears in the queue and can be resolved', async ({ page, browser }) => {
    test.setTimeout(120_000)
    requireEnv(env, ['E2E_MENTOR_ID'])
    const ref = await findAssignmentByType('quiz')
    test.skip(!ref, 'No quiz assignment visible in the seeded content.')
    const { correctOptionByQuestion, totalQuestions } = await quizCorrectAnswers(ref!.id)
    test.skip(totalQuestions === 0, 'Quiz has no questions.')

    // A dedicated, single-use student assigned to the test mentor — kept
    // isolated from assignments.spec.ts's own throwaway student so the two
    // files never race on the same account or assignment cooldown.
    const email = `e2e+mentor-queue-${Date.now()}@example.com`
    const password = 'a-strong-password-123'
    const studentId = await upsertAuthUser(email, password, 'E2E Mentor-Queue Student')
    const db = supabaseAdmin()
    const { error: assignErr } = await db
      .from('mentor_assignments')
      .insert({ mentor_id: process.env.E2E_MENTOR_ID, student_id: studentId, is_active: true })
    if (assignErr) throw assignErr

    try {
      const studentContext = await browser.newContext()
      const studentPage = await studentContext.newPage()
      await studentPage.goto('/login')
      await studentPage.getByLabel('Email').fill(email)
      await studentPage.getByLabel('Password', { exact: true }).fill(password)
      await studentPage.getByRole('button', { name: /log in/i }).click()
      await expect(studentPage).toHaveURL(/\/dashboard$/, { timeout: 20_000 })

      await studentPage.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
      for (const [questionId, correctOptionId] of correctOptionByQuestion) {
        const radios = studentPage.locator(`input[type="radio"][name="${questionId}"]`)
        const count = await radios.count()
        for (let i = 0; i < count; i++) {
          const value = await radios.nth(i).getAttribute('value')
          if (value !== correctOptionId) {
            await radios.nth(i).check({ force: true })
            break
          }
        }
      }
      await studentPage.getByRole('button', { name: /submit answers/i }).click()
      await expect(studentPage.getByText('needs work', { exact: true })).toBeVisible({ timeout: 30_000 })

      await studentPage.getByRole('button', { name: /ask a mentor for a second look/i }).click()
      await studentPage.getByPlaceholder(/what would you like a mentor/i).fill('E2E: can you sanity-check this?')
      await studentPage.getByRole('button', { name: /request review/i }).click()
      await expect(studentPage.getByText(/you asked for a second look/i)).toBeVisible({ timeout: 15_000 })
      await studentContext.close()

      // Now resolve it as the mentor.
      await page.goto('/mentor/queue')
      await expect(page.getByText('E2E Mentor-Queue Student')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/student requested review/i)).toBeVisible()

      const card = page.locator('.rounded-panel.border-2.border-ink.bg-surface').filter({ hasText: 'E2E Mentor-Queue Student' })
      await card.getByRole('button', { name: /^pass$/i }).click()
      await card.getByPlaceholder(/feedback for the student/i).fill('E2E: looks right — resolving as passed.')
      await card.getByRole('button', { name: /^resolve$/i }).click()
      await expect(page.getByText('E2E Mentor-Queue Student')).toHaveCount(0, { timeout: 15_000 })

      await page.getByRole('button', { name: /^resolved/i }).click()
      await expect(page.getByText('E2E Mentor-Queue Student')).toBeVisible()
      await expect(page.getByText(/resolved: passed/i)).toBeVisible()
    } finally {
      await supabaseAdmin().auth.admin.deleteUser(studentId)
    }
  })
})
