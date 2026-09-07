// Creates an admin and a mentor test user against a REAL Supabase project.
//
// Signup always creates a 'student' (that's the profiles.role default —
// see supabase/migrations/20250101000002_profiles.sql), so admin and
// mentor accounts can't be self-registered through the app. This script
// uses the Auth Admin API (auth.admin.createUser), which is the only
// supported way to create a confirmed user directly — inserting into
// auth.users by hand skips GoTrue's password hashing and identity
// bookkeeping and is not something Supabase supports.
//
// Usage:
//   1. cp .env.test.example .env.test and fill it in with your project's
//      values (find the service role key in Supabase dashboard ->
//      Project Settings -> API — never commit it, never ship it to a
//      client bundle).
//   2. node scripts/create-test-users.mjs
//
// Safe to re-run: skips any email that already has an auth user.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnvFile(path) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return {}
  }
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.test'), ...process.env }

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = env.TEST_ADMIN_EMAIL
const ADMIN_PASSWORD = env.TEST_ADMIN_PASSWORD
const MENTOR_EMAIL = env.TEST_MENTOR_EMAIL
const MENTOR_PASSWORD = env.TEST_MENTOR_PASSWORD

const missing = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD', 'TEST_MENTOR_EMAIL', 'TEST_MENTOR_PASSWORD'].filter(
  (k) => !env[k],
)
if (missing.length > 0) {
  console.error(`Missing required values: ${missing.join(', ')}`)
  console.error('Set these in .env (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and .env.test (the rest) — see .env.test.example.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function upsertUser(email, password, fullName, role) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  let userId = created?.user?.id
  if (createErr) {
    if (!createErr.message?.toLowerCase().includes('already been registered')) {
      throw createErr
    }
    // Already exists — look it up instead of failing the whole run.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    userId = list.users.find((u) => u.email === email)?.id
    if (!userId) throw new Error(`${email} reported as already registered but not found in listUsers()`)
    console.log(`${email} already exists, reusing id ${userId}`)
  } else {
    console.log(`Created ${email} (${userId})`)
  }

  // handle_new_user() already inserted a 'student' profile row on
  // creation; promote it to the intended role.
  const { error: updateErr } = await admin.from('profiles').update({ role, full_name: fullName }).eq('id', userId)
  if (updateErr) throw updateErr
  console.log(`  -> role set to ${role}`)
}

await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Test Admin', 'admin')
await upsertUser(MENTOR_EMAIL, MENTOR_PASSWORD, 'Test Mentor', 'mentor')

console.log('\nDone. Log in at /login with the emails/passwords from .env.test.')
