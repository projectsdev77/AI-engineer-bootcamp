// Supabase Edge Function: notify-flagged-submission
// Invoked by the client right after flag_submission_for_review() succeeds.
// Mirrors check-resource-links' notifyAdmins pattern: email the person who
// actually needs to act. A student's active mentor is that person; if they
// don't have one assigned yet, the flag would otherwise be invisible to
// everyone (the exception queue is scoped to a mentor's own students, and
// there's no admin-side view of it) — so fall back to every admin, same as
// broken-link notifications already do.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { escapeHtml, sendEmail } from '../_shared/resend.ts'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
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

  let submissionId: string | undefined
  try {
    ;({ submissionId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!submissionId) return jsonResponse({ error: 'submissionId is required' }, 400)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('id, user_id, assignment_id, flag_reason')
    .eq('id', submissionId)
    .single()
  if (subErr || !submission) {
    return jsonResponse({ error: 'submission not found' }, 404)
  }

  const [{ data: student }, { data: assignment }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', submission.user_id).single(),
    supabase.from('assignments').select('title').eq('id', submission.assignment_id).single(),
  ])
  const studentName = student?.full_name ?? 'A student'
  const assignmentTitle = assignment?.title ?? 'an assignment'

  const { data: mentorLink } = await supabase
    .from('mentor_assignments')
    .select('mentor_id')
    .eq('student_id', submission.user_id)
    .eq('is_active', true)
    .maybeSingle()

  const html = `<p><strong>${escapeHtml(studentName)}</strong> asked for a second look on <strong>${escapeHtml(assignmentTitle)}</strong>.</p>
${submission.flag_reason ? `<p>Their note: "${escapeHtml(submission.flag_reason)}"</p>` : ''}
<p><a href="${SITE_URL}/mentor/queue">Review it in your exception queue</a></p>`

  let recipientIds: string[]
  if (mentorLink?.mentor_id) {
    recipientIds = [mentorLink.mentor_id as string]
  } else {
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
    recipientIds = (admins ?? []).map((a) => a.id as string)
  }

  let sent = 0
  for (const id of recipientIds) {
    const { data: authUser } = await supabase.auth.admin.getUserById(id)
    const email = authUser?.user?.email
    if (!email) continue
    try {
      await sendEmail({ to: email, subject: `${studentName} requested a review`, html })
      sent++
    } catch (e) {
      console.error(`Failed to notify ${id}`, e)
    }
  }

  return jsonResponse({ ok: true, sent, fellBackToAdmins: !mentorLink?.mentor_id })
})
