// Assignment submission: quiz (deterministic, rule-based), text and url
// (real Gemini grading — see supabase/functions/evaluate-submission), the
// 60s inter-submission rate limit, and flag-for-review.
//
// Uses a dedicated throwaway student account (created here, deleted in
// afterAll) rather than the shared persistent TEST_STUDENT — submitting
// and passing an assignment is a one-way UI action (the form disappears
// forever once passed, see AssignmentPage.tsx's `!alreadyPassed` guard),
// so reusing the shared account across repeated suite runs would
// permanently break itself. Content lookups (which assignment is which
// type) still go through the shared student session — read-only and safe
// to share.
import { test, expect, type Page } from '@playwright/test'
import { loadTestEnv, requireEnv } from './helpers/env'
import { upsertAuthUser, supabaseAdmin } from './helpers/supabaseAdmin'
import { findAssignmentByType, getAssignment, quizCorrectAnswers } from './helpers/testData'

const env = loadTestEnv()
requireEnv(env, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

const throwawayEmail = `e2e+assignments-${Date.now()}@example.com`
const throwawayPassword = 'a-strong-password-123'
let throwawayUserId: string

test.beforeAll(async () => {
  throwawayUserId = await upsertAuthUser(throwawayEmail, throwawayPassword, 'E2E Assignment Student')
})

test.afterAll(async () => {
  await supabaseAdmin().auth.admin.deleteUser(throwawayUserId)
})

async function loginAsThrowawayStudent(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(throwawayEmail)
  await page.getByLabel('Password', { exact: true }).fill(throwawayPassword)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })
}

function loremWords(n: number): string {
  const words = [
    'model',
    'prompt',
    'evaluation',
    'pipeline',
    'dataset',
    'inference',
    'context',
    'token',
    'retrieval',
    'embedding',
    'agent',
    'system',
    'design',
    'reliable',
    'iterate',
  ]
  return Array.from({ length: n }, (_, i) => words[i % words.length]).join(' ') + '.'
}

test.describe('Quiz assignment', () => {
  test('an all-wrong attempt is graded instantly as needs work, and immediately rate-limits the next attempt', async ({ page }) => {
    const ref = await findAssignmentByType('quiz')
    test.skip(!ref, 'No quiz assignment visible in the seeded content.')

    const { correctOptionByQuestion, totalQuestions } = await quizCorrectAnswers(ref!.id)
    test.skip(totalQuestions === 0, 'Quiz has no questions.')

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(ref!.title, 'i') })).toBeVisible()

    // Pick a wrong option per question so the deterministic rule-based
    // grader (grading.ts: gradeQuiz) is guaranteed to score 0%.
    for (const [questionId, correctOptionId] of correctOptionByQuestion) {
      const radios = page.locator(`input[type="radio"][name="${questionId}"]`)
      const count = await radios.count()
      for (let i = 0; i < count; i++) {
        const value = await radios.nth(i).getAttribute('value')
        if (value !== correctOptionId) {
          await radios.nth(i).check({ force: true })
          break
        }
      }
    }

    await page.getByRole('button', { name: /submit answers/i }).click()
    await expect(page.getByText('needs work', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/you scored 0%/i)).toBeVisible()
    await expect(page.getByText(/retries don't cost you anything/i)).toBeVisible()

    // The 60s cooldown is generic across assignment types (AssignmentPage:
    // rateLimited = secondsUntilNextAttempt > 0), and should already be
    // active from the submission just made, with no page reload needed.
    await expect(page.getByText(/you can submit again in \d+s/i)).toBeVisible()
  })

  test('an all-correct attempt passes and unlocks the "continue" affordance', async ({ page }) => {
    test.setTimeout(150_000)
    // A different quiz assignment than the previous test used (offset 0),
    // to sidestep that same assignment's 60s cooldown — falls back to the
    // same one and waits the cooldown out if there's only one quiz.
    let ref = await findAssignmentByType('quiz', 1)
    if (!ref) ref = await findAssignmentByType('quiz', 0)
    test.skip(!ref, 'No quiz assignment visible in the seeded content.')
    const { correctOptionByQuestion, totalQuestions } = await quizCorrectAnswers(ref!.id)
    test.skip(totalQuestions === 0, 'Quiz has no questions.')

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    await expect(page.getByText(/you can submit again in/i)).toHaveCount(0, { timeout: 65_000 })

    for (const [questionId, correctOptionId] of correctOptionByQuestion) {
      await page.locator(`input[type="radio"][name="${questionId}"][value="${correctOptionId}"]`).check({ force: true })
    }
    await page.getByRole('button', { name: /submit answers/i }).click()

    await expect(page.getByText('passed', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/nice work — the next week is ready/i)).toBeVisible()
    // Once passed the submission form is gone for good (by design) —
    // confirm that too, since it's load-bearing for this file's account
    // isolation strategy and worth catching if it regresses either way.
    await expect(page.getByRole('button', { name: /submit answers/i })).toHaveCount(0)
  })
})

test.describe('Text assignment (real Gemini grading)', () => {
  test('a substantive submission gets AI feedback and a pass/needs-work verdict', async ({ page }) => {
    test.setTimeout(120_000)
    const ref = await findAssignmentByType('text')
    test.skip(!ref, 'No text assignment visible in the seeded content.')
    const assignment = await getAssignment(ref!.id)
    const config = assignment.config as { min_words?: number; max_words?: number }
    const wordCount = Math.min((config.min_words ?? 50) + 20, config.max_words ?? (config.min_words ?? 50) + 20)

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(ref!.title, 'i') })).toBeVisible()

    await page.locator('textarea').fill(loremWords(wordCount))
    await page.getByRole('button', { name: /^submit$/i }).click()

    // Real network call to Gemini — generous timeout, this is the one
    // place in the suite that's allowed to be genuinely slow.
    await expect(page.getByText(/ai feedback/i)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('passed', { exact: true }).or(page.getByText('needs work', { exact: true }))).toBeVisible()
  })

  test('below the minimum word count, submit stays disabled', async ({ page }) => {
    const ref = await findAssignmentByType('text')
    test.skip(!ref, 'No text assignment visible in the seeded content.')

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    await page.locator('textarea').fill('too short')
    await expect(page.getByRole('button', { name: /^submit$/i })).toBeDisabled()
  })
})

test.describe('URL assignment (real Gemini grading)', () => {
  test('a URL from a disallowed host shows an inline validation error before submitting', async ({ page }) => {
    const ref = await findAssignmentByType('url')
    test.skip(!ref, 'No url assignment visible in the seeded content.')
    const assignment = await getAssignment(ref!.id)
    const config = assignment.config as { allowed_hosts?: string[] }
    test.skip(!config.allowed_hosts || config.allowed_hosts.length === 0, 'This url assignment accepts any host.')

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    const input = page.locator('input[type="url"]')
    await input.fill('https://definitely-not-an-allowed-host.example.com/thing')
    await input.blur()
    await expect(page.getByText(/expected a link from/i)).toBeVisible()
  })

  test('a URL that does not resolve to anything real still grades gracefully (server-side fetch fails, AI leans needs_work)', async ({ page }) => {
    test.setTimeout(120_000)
    const ref = await findAssignmentByType('url')
    test.skip(!ref, 'No url assignment visible in the seeded content.')
    const assignment = await getAssignment(ref!.id)
    const config = assignment.config as { allowed_hosts?: string[] }
    const host = config.allowed_hosts?.[0] ?? 'github.com'

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    // evaluate-submission tries to fetch this server-side (grading.ts /
    // index.ts) — a made-up repo path 404s, which should surface as
    // "needs_work" with feedback telling the student to check the link,
    // not as an evaluation failure.
    await page.locator('input[type="url"]').fill(`https://${host}/e2e-test-nonexistent/example-project-${Date.now()}`)
    await page.getByRole('button', { name: /^submit$/i }).click()

    await expect(page.getByText(/ai feedback/i)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('passed', { exact: true }).or(page.getByText('needs work', { exact: true }))).toBeVisible()
  })

  test('a real, reachable GitHub repo gets graded on its actual README content', async ({ page }) => {
    test.setTimeout(150_000)
    // A different url assignment than the previous test used (offset 0),
    // to sidestep that same assignment's 60s cooldown — falls back to the
    // same one and waits the cooldown out if there's only one url assignment.
    let ref = await findAssignmentByType('url', 1)
    if (!ref) ref = await findAssignmentByType('url', 0)
    test.skip(!ref, 'No url assignment visible in the seeded content.')
    const assignment = await getAssignment(ref!.id)
    const config = assignment.config as { allowed_hosts?: string[] }
    const allowsGithub = !config.allowed_hosts || config.allowed_hosts.length === 0 || config.allowed_hosts.includes('github.com')
    test.skip(!allowsGithub, 'This assignment does not accept github.com links.')

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    await expect(page.getByText(/you can submit again in/i)).toHaveCount(0, { timeout: 65_000 })
    // GitHub's own long-standing canonical demo repo — stable, public,
    // and has a real README, so this exercises the server-side
    // README-fetch enrichment path end-to-end (not just the URL string).
    await page.locator('input[type="url"]').fill('https://github.com/octocat/Hello-World')
    await page.getByRole('button', { name: /^submit$/i }).click()

    await expect(page.getByText(/ai feedback/i)).toBeVisible({ timeout: 60_000 })
    // Real content was fetched and graded either way — this just confirms
    // the pipeline produced a real verdict, not a stuck/failed evaluation.
    await expect(page.getByText('passed', { exact: true }).or(page.getByText('needs work', { exact: true }))).toBeVisible()
  })
})

test.describe('Flag for review', () => {
  test('a graded submission can be flagged, moving it into the mentor exception queue', async ({ page }) => {
    test.setTimeout(150_000)
    // Prefer a *different* text assignment than the other text-assignment
    // tests in this file use (offset 0), so this doesn't collide with
    // their 60s per-assignment submission cooldown. Falls back to offset 0
    // and simply waits the cooldown out if the seeded content only has one.
    let ref = await findAssignmentByType('text', 1)
    if (!ref) ref = await findAssignmentByType('text', 0)
    test.skip(!ref, 'No text assignment visible in the seeded content.')
    const assignment = await getAssignment(ref!.id)
    const config = assignment.config as { min_words?: number; max_words?: number }
    const wordCount = Math.min((config.min_words ?? 50) + 20, config.max_words ?? (config.min_words ?? 50) + 20)

    await loginAsThrowawayStudent(page)
    await page.goto(`/weeks/${ref!.weekId}/assignments/${ref!.id}`)
    // Wait out any cooldown left over from an earlier submission to this
    // same assignment (only relevant on the offset-0 fallback path).
    await expect(page.getByText(/you can submit again in/i)).toHaveCount(0, { timeout: 65_000 })
    await page.locator('textarea').fill(loremWords(wordCount))
    await page.getByRole('button', { name: /^submit$/i }).click()
    await expect(page.getByText(/ai feedback/i)).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: /ask a mentor for a second look/i }).click()
    await page.getByPlaceholder(/what would you like a mentor/i).fill('E2E: please double-check this grading.')
    await page.getByRole('button', { name: /request review/i }).click()
    await expect(page.getByText(/you asked for a second look/i)).toBeVisible({ timeout: 15_000 })
  })
})
