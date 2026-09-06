// Supabase Edge Function: notify-message
// Invoked by the client after inserting a message. Per spec 4 (SHOULD
// HAVE): "Email notification when a mentor replies" — one direction only,
// so a message where the sender IS the student (i.e. the student wrote to
// their own thread) is a no-op here.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { escapeHtml, sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  let messageId: string | undefined
  try {
    ;({ messageId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!messageId) return jsonResponse({ error: 'messageId is required' }, 400)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single()
  if (error || !message) {
    return jsonResponse({ error: 'message not found' }, 404)
  }

  // Student messaging their own thread doesn't need a notification.
  if (message.sender_id === message.student_id) {
    return jsonResponse({ ok: true, skipped: 'sender_is_student' })
  }

  const [{ data: authUser }, { data: mentorProfile }] = await Promise.all([
    supabase.auth.admin.getUserById(message.student_id),
    supabase.from('profiles').select('full_name').eq('id', message.sender_id).single(),
  ])
  const studentEmail = authUser?.user?.email
  if (!studentEmail) {
    return jsonResponse({ error: 'could not resolve student email' }, 404)
  }

  try {
    await sendEmail({
      to: studentEmail,
      subject: 'New message from your mentor',
      html: `<p>${escapeHtml(mentorProfile?.full_name ?? 'Your mentor')} sent you a message:</p>
<blockquote>${escapeHtml(message.body)}</blockquote>
<p><a href="${SITE_URL}/dashboard">Reply on your dashboard</a></p>`,
    })
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 200)
  }

  return jsonResponse({ ok: true })
})
