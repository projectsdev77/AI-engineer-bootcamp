// Minimal .env loader shared by the Playwright config and the Node-side
// (never browser-side) setup scripts. Mirrors scripts/create-test-users.mjs
// so both tools agree on precedence: .env, then .env.test, then real
// process.env last (so CI secrets always win).
import { readFileSync } from 'node:fs'
import path from 'node:path'

function parseEnvFile(filePath: string): Record<string, string> {
  let text: string
  try {
    text = readFileSync(filePath, 'utf8')
  } catch {
    return {}
  }
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

export interface TestEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  TEST_ADMIN_EMAIL?: string
  TEST_ADMIN_PASSWORD?: string
  TEST_MENTOR_EMAIL?: string
  TEST_MENTOR_PASSWORD?: string
  TEST_STUDENT_EMAIL?: string
  TEST_STUDENT_PASSWORD?: string
  PLAYWRIGHT_BASE_URL?: string
  PLAYWRIGHT_PORT?: string
  [key: string]: string | undefined
}

let cached: TestEnv | undefined

export function loadTestEnv(): TestEnv {
  if (cached) return cached
  const root = path.resolve(import.meta.dirname, '..', '..')
  cached = {
    ...parseEnvFile(path.join(root, '.env')),
    ...parseEnvFile(path.join(root, '.env.test')),
    ...(process.env as Record<string, string>),
  }
  return cached
}

export function requireEnv(env: TestEnv, keys: string[]): void {
  const missing = keys.filter((k) => !env[k])
  if (missing.length > 0) {
    throw new Error(
      `Missing required E2E env values: ${missing.join(', ')}. Set them in .env / .env.test — see .env.test.example. ` +
        `The E2E suite runs against your real, already-deployed Supabase project (VITE_SUPABASE_URL), so these must be real credentials.`,
    )
  }
}
