// Service-role Supabase client for Node-side test setup/teardown only.
// Never import this from a spec file that runs in a browser page context —
// SUPABASE_SERVICE_ROLE_KEY must never reach a browser bundle, the same
// rule the app's own .env.example documents for edge functions.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadTestEnv, requireEnv } from './env'

let client: SupabaseClient | undefined

export function supabaseAdmin(): SupabaseClient {
  if (client) return client
  const env = loadTestEnv()
  requireEnv(env, ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  client = createClient(env.VITE_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}

/** Idempotent: creates a confirmed auth user if missing, else reuses it. Returns the user id. */
export async function upsertAuthUser(email: string, password: string, fullName: string): Promise<string> {
  const admin = supabaseAdmin()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (!createErr) return created!.user!.id

  if (!createErr.message?.toLowerCase().includes('already been registered')) throw createErr
  const { data: list, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) throw listErr
  const existing = list.users.find((u) => u.email === email)
  if (!existing) throw new Error(`${email} reported as already registered but not found in listUsers()`)
  // Reset the password so a stale/forgotten local password never blocks a
  // fresh run — this account exists solely for this suite to log into.
  await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
  return existing.id
}

export async function setProfileRole(userId: string, role: 'student' | 'mentor' | 'admin', fullName: string): Promise<void> {
  const { error } = await supabaseAdmin().from('profiles').update({ role, full_name: fullName }).eq('id', userId)
  if (error) throw error
}
