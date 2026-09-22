// Supabase Edge Function: admin-list-emails
//
// Admin-only. Returns { id: email } for every auth user. profiles has no
// email column — email only lives on auth.users, which the client can
// never query directly (no RLS access, and the anon key has no visibility
// into it) — so anything admin-side that needs to search or display email
// (the students list search box, for one) has to go through the service
// role via the Admin API, same reason admin-mentor-status exists.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function listAllAuthUsers(admin: ReturnType<typeof createClient>) {
  const users: { id: string; email?: string | null }[] = []
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

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'missing Authorization header' }, 401)
  }

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
    error: callerErr,
  } = await callerClient.auth.getUser()
  if (callerErr || !caller) {
    return jsonResponse({ error: 'not authenticated' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'admin') {
    return jsonResponse({ error: 'admin only' }, 403)
  }

  let authUsers: Awaited<ReturnType<typeof listAllAuthUsers>>
  try {
    authUsers = await listAllAuthUsers(admin)
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Failed to list users' }, 500)
  }

  const emails = Object.fromEntries(authUsers.map((u) => [u.id, u.email ?? '']))

  return jsonResponse({ emails })
})
