// Supabase Edge Function: delete-account
//
// Self-service "delete my account". Deliberately does NOT take a userId in
// the request body — the account to delete is always the caller's own,
// resolved from their verified session token, never from client input.
// That's the whole reason this needs to be an edge function instead of a
// client-side call: deleting an auth.users row requires the service role
// (supabase.auth.admin.deleteUser), and a client that could pass an
// arbitrary id straight to that would let anyone delete anyone.
//
// Deleting the row cascades through every table via the on-delete rules
// added in 20250101000016_account_deletion_cascades.sql: owned data
// (submissions, messages, mentor assignments, ...) is removed, while
// references to this account as a reviewer/actor on someone else's data,
// and issued certificates, are preserved with the reference nulled out.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'missing Authorization header' }, 401)
  }

  // Verifies the caller's own JWT and resolves their user id from it —
  // never trust a client-supplied id for a destructive, cross-account
  // capable operation like this one.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await callerClient.auth.getUser()
  if (userErr || !user) {
    return jsonResponse({ error: 'not authenticated' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    return jsonResponse({ error: deleteErr.message }, 500)
  }

  return jsonResponse({ ok: true })
})
