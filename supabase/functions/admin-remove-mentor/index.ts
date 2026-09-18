// Supabase Edge Function: admin-remove-mentor
//
// Admin-only counterpart to admin-invite-mentor. Deletes a mentor's
// account entirely (not a status toggle — this app doesn't have an
// inactive/suspended mentor state, and adding one just for this would be
// more machinery than "the mentor left" needs). Needs the service role
// because deleting an auth.users row requires it, same as delete-account.
//
// Reuses the exact cascade rules from 20250101000016_account_deletion_cascades.sql:
// the mentor's mentor_assignments rows cascade away (their students become
// unassigned — the admin UI's per-student "assigned mentor" dropdown is
// how those get manually reassigned afterward), while their reference as
// a reviewer on submissions/unlocks/submission_events is nulled out
// rather than deleting that data. Client-side confirms before calling
// this when the mentor still has active students, so the caller isn't
// surprised by that.
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

  let mentorId: string | undefined
  try {
    ;({ mentorId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!mentorId) return jsonResponse({ error: 'mentorId is required' }, 400)

  // Never let this endpoint delete anything but a mentor — a client bug
  // or tampered request passing a student's or admin's id must not turn
  // this into a general-purpose delete-any-user function.
  const { data: target } = await admin.from('profiles').select('role').eq('id', mentorId).single()
  if (target?.role !== 'mentor') {
    return jsonResponse({ error: 'That account is not a mentor.' }, 400)
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(mentorId)
  if (deleteErr) {
    return jsonResponse({ error: deleteErr.message }, 500)
  }

  return jsonResponse({ ok: true })
})
