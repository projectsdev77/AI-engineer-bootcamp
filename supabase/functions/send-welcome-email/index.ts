// Supabase Edge Function: send-welcome-email
// Invoked by the client immediately after signup. email_log is the only
// dedupe mechanism (per 5.6: "exists to prevent duplicate sends, nothing
// more") — since email_type='welcome' is meant to fire at most once ever
// per user, one existing row is enough to skip.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  let userId: string | undefined
  try {
    ;({ userId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!userId) return jsonResponse({ error: 'userId is required' }, 400)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: alreadySent } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', 'welcome')
    .maybeSingle()
  if (alreadySent) {
    return jsonResponse({ ok: true, skipped: 'already_sent' })
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId)
  const email = authUser?.user?.email
  if (authErr || !email) {
    return jsonResponse({ error: 'could not resolve user email' }, 404)
  }

  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Become an AI Engineer',
      html: `<p>Hi ${profile?.full_name ?? 'there'},</p>
<p>Welcome to Become an AI Engineer. Week 1 is already unlocked and waiting for you.</p>
<p><a href="${SITE_URL}/dashboard">Go to your dashboard</a></p>`,
    })
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 200)
  }

  await supabase.from('email_log').insert({ user_id: userId, email_type: 'welcome' })
  return jsonResponse({ ok: true })
})
