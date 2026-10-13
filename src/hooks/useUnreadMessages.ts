import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/** Dispatched after messages are marked read or a ticket changes, so the nav badge can update immediately. */
export const MESSAGES_READ_EVENT = 'messages-read'

/**
 * Nav badge counts for the question inbox: unread replies in the caller's
 * own conversations, and (for mentors/admins) questions waiting in the
 * shared queue.
 *
 * Re-checks on route change and on MESSAGES_READ_EVENT, so reading a
 * thread clears the badge right away instead of on the next navigation.
 */
export function useUnreadMessages() {
  const { user } = useAuth()
  const location = useLocation()
  const [counts, setCounts] = useState({ unread: 0, unclaimed: 0 })

  const refresh = useCallback(async () => {
    if (!user) {
      setCounts({ unread: 0, unclaimed: 0 })
      return
    }
    const { data } = await supabase.rpc('ticket_badge_counts')
    const row = (data as { unread: number; unclaimed: number }[] | null)?.[0]
    setCounts({ unread: row?.unread ?? 0, unclaimed: row?.unclaimed ?? 0 })
  }, [user])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, location.pathname])

  useEffect(() => {
    const handler = () => void refresh()
    window.addEventListener(MESSAGES_READ_EVENT, handler)
    return () => window.removeEventListener(MESSAGES_READ_EVENT, handler)
  }, [refresh])

  return counts
}
