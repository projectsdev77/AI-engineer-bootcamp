import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Message } from '@/types/database'

/** The 1:1 mentor/student thread — every message sharing `studentId` (no separate conversations table). */
export function useMessageThread(studentId: string | undefined) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    if (!studentId) return
    // Deliberately not setLoading(true) here: send() also calls refresh(),
    // and flipping loading back to true on every sent message would
    // unmount the whole thread back to a bare "loading…" state on every
    // send, which reads as the page reloading.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setMessages((data ?? []) as Message[])
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  // Marks the other party's messages read the moment this thread is
  // viewed — this is what clears the unread badge in AppNav
  // (useUnreadMessages). Keyed on the loaded messages themselves (not
  // just mount) so reopening/re-polling an already-open thread still
  // catches anything that arrived since.
  useEffect(() => {
    if (!user) return
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id)
    if (unreadIds.length === 0) return
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(undefined, () => {})
  }, [messages, user])

  async function send(body: string) {
    if (!studentId || !user || !body.trim()) return
    setSending(true)
    const { data, error } = await supabase
      .from('messages')
      .insert({ student_id: studentId, sender_id: user.id, body: body.trim() })
      .select()
      .single()
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    // Fire-and-forget: a notification failure should never block sending.
    supabase.functions.invoke('notify-message', { body: { messageId: data.id } }).catch(() => {})
    await refresh()
  }

  return { messages, loading, sending, error, send, refresh }
}
