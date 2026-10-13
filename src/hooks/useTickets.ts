import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MESSAGES_READ_EVENT } from '@/hooks/useUnreadMessages'
import type { TicketSummary } from '@/types/database'

/**
 * Every ticket the caller can see (list_tickets applies the same rules as
 * RLS): a student's own; for a mentor, the unclaimed queue plus their own;
 * for an admin, everything.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_tickets')
    if (error) setError(error.message)
    else {
      setError(null)
      setTickets((data ?? []) as TicketSummary[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handler = () => void refresh()
    window.addEventListener(MESSAGES_READ_EVENT, handler)
    return () => window.removeEventListener(MESSAGES_READ_EVENT, handler)
  }, [refresh])

  return { tickets, loading, error, refresh }
}
