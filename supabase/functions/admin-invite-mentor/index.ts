// Supabase Edge Function: admin-invite-mentor
//
// Admin-only. Creates a brand-new mentor account for someone with no
// existing student account — the "we just hired a mentor" case, as
// opposed to admin_reassign_mentor (which only reassigns among mentors
// that already exist). Needs the service role because creating an
// auth.users row and setting a role other than the 'student' default both
// require it.
//
// Uses Supabase Auth's own invite flow (auth.admin.inviteUserByEmail)
// rather than the app's Resend-based notification emails — this is an
// account-creation/auth email, the same category as the password-reset
// email, not a content notification. The invite link lands the new mentor
// on /reset-password/confirm already signed in (Supabase's invite and
// recovery links both establish a session via detectSessionInUrl the same
// way), where they set their own password — no new frontend needed for
// their side of onboarding.
//
// Passes role: 'mentor' in the invited user's metadata so handle_new_user
// (20250101000021) creates the profile row with the right role from the
// start, rather than a follow-up UPDATE after it's briefly a 'student' —
// see that migration for why the race matters here.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

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

  let email: string | undefined
  let fullName: string | undefined
  try {
    ;({ email, fullName } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!email) return jsonResponse({ error: 'email is required' }, 400)

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName ?? null, role: 'mentor' },
    redirectTo: `${SITE_URL}/reset-password/confirm`,
  })
  if (inviteErr || !invited?.user) {
    return jsonResponse({ error: inviteErr?.message ?? 'Failed to send invite' }, 500)
  }

  return jsonResponse({ ok: true })
})
