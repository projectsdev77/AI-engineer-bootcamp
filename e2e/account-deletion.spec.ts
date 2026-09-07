// Account deletion end-to-end, through the real UI, against a disposable
// account created just for this test. Exercises the delete-account edge
// function and the FK cascades from
// supabase/migrations/20250101000016_account_deletion_cascades.sql for
// real — not just the local-Postgres harness used to validate the SQL
// during development.
import { test, expect } from '@playwright/test'
import { upsertAuthUser, supabaseAdmin } from './helpers/supabaseAdmin'

test('a student can permanently delete their own account from Settings', async ({ page }) => {
  const email = `e2e+delete-${Date.now()}@example.com`
  const password = 'a-strong-password-123'
  const userId = await upsertAuthUser(email, password, 'E2E Delete-Me Student')

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })

  await page.goto('/settings')
  await page.getByRole('button', { name: /delete my account/i }).click()
  await page.getByLabel(/type delete to confirm/i).fill('DELETE')
  await page.getByRole('button', { name: /permanently delete/i }).click()

  // Signs out locally as part of deletion and lands on the marketing home.
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });

  // The account is gone server-side: logging in with the same credentials
  // must now fail, and the auth user must no longer exist.
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page.getByText(/couldn't log in/i)).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/login$/)

  const { data: list, error } = await supabaseAdmin().auth.admin.listUsers()
  if (error) throw error
  expect(list.users.some((u) => u.id === userId)).toBe(false)
})
