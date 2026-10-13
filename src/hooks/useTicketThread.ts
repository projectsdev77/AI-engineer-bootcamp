import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { MESSAGES_READ_EVENT } from '@/hooks/useUnreadMessages'
import { signAttachmentUrls, uploadAttachments } from '@/lib/messageAttachments'
import type { Message, TicketSummary } from '@/types/database'

const POLL_MS = 20_000

function notifyChanged() {
  window.dispatchEvent(new Event(MESSAGES_READ_EVENT))
}

/** One ticket: its summary row, messages, signed attachment links, and the actions on it. */
export function useTicketThread(ticketId: string | undefined) {
  const { user } = useAuth()
  const [ticket, setTicket] = useState<TicketSummary | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Paths already signed (or being signed), so polling doesn't re-sign them.
  const signedPaths = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!ticketId) return
    // Deliberately not setLoading(true) here: sending and polling also
    // refresh, and flipping back to "loading…" would blank the thread.
    const [{ data: rows, error: ticketError }, { data: msgs, error: msgError }] = await Promise.all([
      supabase.rpc('list_tickets', { p_ticket_id: ticketId }),
      supabase.from('messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ])
    const err = ticketError ?? msgError
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setError(null)
    setTicket(((rows ?? []) as TicketSummary[])[0] ?? null)
    const list = (msgs ?? []) as Message[]
    setMessages(list)

    const paths = list.flatMap((m) => (m.attachments ?? []).map((a) => a.path))
    const missing = paths.filter((p) => !signedPaths.current.has(p))
    if (missing.length > 0) {
      missing.forEach((p) => signedPaths.current.add(p))
      void signAttachmentUrls(missing).then((signed) => setAttachmentUrls((cur) => new Map([...cur, ...signed])))
    }
    setLoading(false)
  }, [ticketId])

  useEffect(() => {
    setLoading(true)
    signedPaths.current = new Set()
    setAttachmentUrls(new Map())
    void refresh()
  }, [refresh])

  // Async inbox, not live chat — a light poll while the tab is visible is
  // enough to pick up a reply without a reload.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  // Mark the other side's messages read — only for the two participants, so
  // a mentor previewing an unclaimed question doesn't clear the unread
  // state the claiming mentor should see.
  const isParticipant = !!user && !!ticket && (ticket.student_id === user.id || ticket.claimed_by === user.id)
  useEffect(() => {
    if (!user || !isParticipant) return
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id)
    if (unreadIds.length === 0) return
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(notifyChanged, () => {})
  }, [messages, user, isParticipant])

  async function send(body: string, files: File[]): Promise<boolean> {
    if (!ticketId || !ticket || !user) return false
    try {
      const attachments = files.length > 0 ? await uploadAttachments(ticketId, files) : []
      const { data, error } = await supabase
        .from('messages')
        .insert({ ticket_id: ticketId, student_id: ticket.student_id, sender_id: user.id, body: body.trim(), attachments })
        .select()
        .single()
      if (error) throw new Error(error.message)
      // Fire-and-forget: a notification failure should never block sending.
      supabase.functions.invoke('notify-message', { body: { messageId: data.id } }).catch(() => {})
      await refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message not sent.')
      return false
    }
  }

  async function runAction(fn: 'claim_ticket' | 'close_ticket', notify?: boolean): Promise<boolean> {
    if (!ticketId) return false
    const { error } = await supabase.rpc(fn, { p_ticket_id: ticketId })
    if (error) {
      setError(error.message)
      await refresh()
      return false
    }
    if (notify) supabase.functions.invoke('notify-message', { body: { closedTicketId: ticketId } }).catch(() => {})
    await refresh()
    notifyChanged()
    return true
  }

  async function reassign(mentorId: string | null): Promise<boolean> {
    if (!ticketId) return false
    const { error } = await supabase.rpc('reassign_ticket', { p_ticket_id: ticketId, p_mentor_id: mentorId })
    if (error) {
      setError(error.message)
      return false
    }
    // Email the newly assigned mentor — otherwise it just appears in their list unannounced.
    if (mentorId) supabase.functions.invoke('notify-message', { body: { assignedTicketId: ticketId } }).catch(() => {})
    await refresh()
    notifyChanged()
    return true
  }

  return {
    ticket,
    messages,
    attachmentUrls,
    loading,
    error,
    clearError: () => setError(null),
    send,
    claim: () => runAction('claim_ticket'),
    close: () => runAction('close_ticket', true),
    reassign,
  }
}
