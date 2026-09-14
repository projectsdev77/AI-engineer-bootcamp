// Supabase Edge Function: admin-mentor-status
//
// Admin-only. Returns which mentor profile ids still have a pending
// invite — i.e. the person hasn't clicked the invite link yet.
//
// admin-invite-mentor's inviteUserByEmail creates the auth.users row (and,
// via handle_new_user, the profiles row) immediately, before the invite is
// ever accepted — that's standard Supabase Auth behavior, not a bug, but
// it means a brand-new mentor shows up in the admin mentor list the
// instant the invite is sent, indistinguishable from one who's actually
// confirmed. auth.users.confirmed_at is the real signal (it's set the
// moment they click the invite link, which is the only thing profiles
// itself has no visibility into — this needs the service role via the
// Admin API), so this exists purely to expose that one field.
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
  const users: { id: string; confirmed_at?: string | null }[] = []
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

  const pending = authUsers.filter((u) => !u.confirmed_at).map((u) => u.id)

  return jsonResponse({ pending })
})
