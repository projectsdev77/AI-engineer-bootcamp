// Supabase Edge Function: notify-message
// Invoked by the client after inserting a message. Per spec 4 (SHOULD
// HAVE): "Email notification when a mentor replies" — one direction only,
// so a message where the sender IS the student (i.e. the student wrote to
// their own question) is a no-op here.
//
// Also invoked with { closedTicketId } after a mentor resolves a question,
// to tell the student it was closed, and with { assignedTicketId } after an
// admin reassigns a question, to tell the newly assigned mentor.
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

  let messageId: string | undefined
  let closedTicketId: string | undefined
  let assignedTicketId: string | undefined
  try {
    ;({ messageId, closedTicketId, assignedTicketId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!messageId && !closedTicketId && !assignedTicketId) {
    return jsonResponse({ error: 'messageId, closedTicketId or assignedTicketId is required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  if (assignedTicketId) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, student_id, subject, context_label, status, claimed_by, claimed_at')
      .eq('id', assignedTicketId)
      .single()
    // Only right after an assignment, so replaying the call can't be used
    // to send the email over and over.
    const recentlyAssigned =
      ticket?.status === 'open' &&
      ticket.claimed_by &&
      ticket.claimed_at &&
      Date.now() - new Date(ticket.claimed_at).getTime() < 10 * 60_000
    if (!ticket || !recentlyAssigned) return jsonResponse({ ok: true, skipped: 'not_recently_assigned' })

    const [{ data: mentorUser }, { data: student }] = await Promise.all([
      supabase.auth.admin.getUserById(ticket.claimed_by),
      supabase.from('profiles').select('full_name').eq('id', ticket.student_id).single(),
    ])
    const mentorEmail = mentorUser?.user?.email
    if (!mentorEmail) return jsonResponse({ error: 'could not resolve mentor email' }, 404)
    try {
      await sendEmail({
        to: mentorEmail,
        subject: `Assigned to you: ${ticket.subject}`,
        html: `<p>An admin assigned you a student question.</p>
<p><strong>${escapeHtml(ticket.subject)}</strong><br>${escapeHtml(ticket.context_label)} · from ${escapeHtml(student?.full_name ?? 'a student')}</p>
<p><a href="${SITE_URL}/questions/${ticket.id}">Open the question</a></p>`,
      })
    } catch (e) {
      return jsonResponse({ ok: false, error: String(e) }, 200)
    }
    return jsonResponse({ ok: true })
  }

  if (closedTicketId) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, student_id, subject, status, closed_at, closed_by')
      .eq('id', closedTicketId)
      .single()
    // Only for a question closed in the last few minutes, so replaying the
    // call can't be used to send the email over and over.
    const recentlyClosed =
      ticket?.status === 'closed' && ticket.closed_at && Date.now() - new Date(ticket.closed_at).getTime() < 10 * 60_000
    if (!ticket || !recentlyClosed) return jsonResponse({ ok: true, skipped: 'not_recently_closed' })

    const [{ data: authUser }, { data: closer }] = await Promise.all([
      supabase.auth.admin.getUserById(ticket.student_id),
      ticket.closed_by
        ? supabase.from('profiles').select('full_name').eq('id', ticket.closed_by).single()
        : Promise.resolve({ data: null }),
    ])
    const studentEmail = authUser?.user?.email
    if (!studentEmail) return jsonResponse({ error: 'could not resolve student email' }, 404)
    try {
      await sendEmail({
        to: studentEmail,
        subject: `Resolved: ${ticket.subject}`,
        html: `<p>${escapeHtml(closer?.full_name ?? 'Your mentor')} marked your question <strong>${escapeHtml(ticket.subject)}</strong> as resolved.</p>
<p>You can still read the conversation. If something new comes up, start a new question.</p>
<p><a href="${SITE_URL}/messages/${ticket.id}">View the conversation</a></p>`,
      })
    } catch (e) {
      return jsonResponse({ ok: false, error: String(e) }, 200)
    }
    return jsonResponse({ ok: true })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single()
  if (error || !message) {
    return jsonResponse({ error: 'message not found' }, 404)
  }

  // Student messaging their own question doesn't need a notification.
  if (!message.sender_id || message.sender_id === message.student_id) {
    return jsonResponse({ ok: true, skipped: 'sender_is_student' })
  }

  const [{ data: authUser }, { data: mentorProfile }, { data: ticket }] = await Promise.all([
    supabase.auth.admin.getUserById(message.student_id),
    supabase.from('profiles').select('full_name').eq('id', message.sender_id).single(),
    supabase.from('tickets').select('subject').eq('id', message.ticket_id).single(),
  ])
  const studentEmail = authUser?.user?.email
  if (!studentEmail) {
    return jsonResponse({ error: 'could not resolve student email' }, 404)
  }

  try {
    await sendEmail({
      to: studentEmail,
      subject: ticket?.subject ? `New reply: ${ticket.subject}` : 'New message from your mentor',
      html: `<p>${escapeHtml(mentorProfile?.full_name ?? 'Your mentor')} replied to your question${
        ticket?.subject ? ` <strong>${escapeHtml(ticket.subject)}</strong>` : ''
      }:</p>
<blockquote>${escapeHtml(message.body)}</blockquote>
<p><a href="${SITE_URL}/messages/${message.ticket_id}">Open the conversation</a></p>`,
    })
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 200)
  }

  return jsonResponse({ ok: true })
})
