// Supabase Edge Function: send-reengagement-emails
// Meant to run on a schedule (e.g. daily) via a Supabase Cron Job. Emails
// students who have gone quiet, at most once per cooldown window, using
// email_log the same way send-welcome-email does.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

const INACTIVITY_THRESHOLD_DAYS = 7
const RESEND_COOLDOWN_DAYS = 14

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const inactiveSince = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 86_400_000).toISOString()
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, last_active_at')
    .eq('role', 'student')
    .eq('status', 'active')
    .lt('last_active_at', inactiveSince)

  if (error) return jsonResponse({ error: error.message }, 500)

  const cooldownSince = new Date(Date.now() - RESEND_COOLDOWN_DAYS * 86_400_000).toISOString()
  let sent = 0
  let skipped = 0

  for (const student of candidates ?? []) {
    const { data: recentSend } = await supabase
      .from('email_log')
      .select('id')
      .eq('user_id', student.id)
      .eq('email_type', 'reengagement')
      .gte('sent_at', cooldownSince)
      .maybeSingle()
    if (recentSend) {
      skipped++
      continue
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(student.id)
    const email = authUser?.user?.email
    if (!email) {
      skipped++
      continue
    }

    try {
      await sendEmail({
        to: email,
        subject: "You've got a week waiting for you",
        html: `<p>Hi ${student.full_name ?? 'there'},</p>
<p>It's been a little while since you were last in Become an AI Engineer. Your progress is saved — pick up right where you left off whenever you're ready.</p>
<p><a href="${SITE_URL}/dashboard">Continue learning</a></p>`,
      })
      await supabase.from('email_log').insert({ user_id: student.id, email_type: 'reengagement' })
      sent++
    } catch (e) {
      console.error(`Failed to send reengagement email to ${student.id}`, e)
      skipped++
    }
  }

  return jsonResponse({ ok: true, sent, skipped, candidates: (candidates ?? []).length })
})
