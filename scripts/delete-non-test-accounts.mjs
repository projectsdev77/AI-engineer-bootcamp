// Deletes every student/mentor account except the ones you want kept as
// test data. Admin accounts are never touched, no matter what.
//
// Defaults to a DRY RUN: lists exactly who would be deleted and deletes
// nothing. Pass --confirm to actually delete.
//
// Which accounts are kept:
//   - By default: TEST_MENTOR_EMAIL and TEST_STUDENT_EMAIL from .env.test
//     (the same file scripts/create-test-users.mjs reads).
//   - Or pass --keep=a@x.com,b@y.com to specify exact emails instead.
//
// Deletion goes through the same auth.admin.deleteUser() call the app's
// own delete-account edge function uses, so it cascades through every
// table exactly the same way (see
// supabase/migrations/20250101000016_account_deletion_cascades.sql).
//
// Usage:
//   node scripts/delete-non-test-accounts.mjs                # dry run
//   node scripts/delete-non-test-accounts.mjs --confirm       # deletes
//   node scripts/delete-non-test-accounts.mjs --keep=a@x.com --confirm
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set these in .env (see .env.example).')
  process.exit(1)
}

const keepArg = process.argv.find((a) => a.startsWith('--keep='))
const KEEP_EMAILS = new Set(
  (keepArg ? keepArg.slice('--keep='.length).split(',') : [env.TEST_MENTOR_EMAIL, env.TEST_STUDENT_EMAIL])
    .filter(Boolean)
    .map((e) => e.trim().toLowerCase()),
)

if (KEEP_EMAILS.size === 0) {
  console.error(
    'No emails to keep were found. Set TEST_MENTOR_EMAIL/TEST_STUDENT_EMAIL in .env.test (see .env.test.example), or pass --keep=a@x.com,b@y.com.',
  )
  process.exit(1)
}

const CONFIRM = process.argv.includes('--confirm')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function listAllAuthUsers() {
  const users = []
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
    page++
  }
  return users
}

// Never touches role='admin' rows, regardless of --keep.
const { data: profiles, error: profilesErr } = await admin.from('profiles').select('id, full_name, role').in('role', ['student', 'mentor'])
if (profilesErr) {
  console.error('Failed to list profiles:', profilesErr.message)
  process.exit(1)
}

const authUsers = await listAllAuthUsers()
const emailById = new Map(authUsers.map((u) => [u.id, u.email?.toLowerCase() ?? '']))

const toDelete = (profiles ?? [])
  .map((p) => ({ id: p.id, role: p.role, name: p.full_name ?? 'unnamed', email: emailById.get(p.id) ?? '(no auth user found)' }))
  .filter((u) => !KEEP_EMAILS.has(u.email))

console.log(`Keeping (by email): ${[...KEEP_EMAILS].join(', ')}`)
console.log(`${toDelete.length} account(s) to delete:\n`)
for (const u of toDelete) console.log(`  ${u.role.padEnd(8)} ${u.email.padEnd(40)} ${u.name}`)

if (!CONFIRM) {
  console.log(`\nDry run only — nothing was deleted. Re-run with --confirm to actually delete these ${toDelete.length} account(s).`)
  process.exit(0)
}

console.log('\nDeleting...')
let deleted = 0
for (const u of toDelete) {
  const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
  if (delErr) {
    console.error(`  FAILED ${u.email}: ${delErr.message}`)
    continue
  }
  deleted++
  console.log(`  deleted ${u.email}`)
}
console.log(`\nDone. Deleted ${deleted}/${toDelete.length} account(s).`)
