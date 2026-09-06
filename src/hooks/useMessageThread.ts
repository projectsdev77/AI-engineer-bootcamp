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
    setLoading(true)
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
    void refresh()
  }, [refresh])

  async function send(body: string) {
    if (!studentId || !user || !body.trim()) return
    setSending(true)
    const { error } = await supabase
      .from('messages')
      .insert({ student_id: studentId, sender_id: user.id, body: body.trim() })
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  return { messages, loading, sending, error, send, refresh }
}
