import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/** Dispatched by useMessageThread right after it marks messages read, so the badge can clear immediately. */
export const MESSAGES_READ_EVENT = 'messages-read'

/**
 * Count of messages waiting on the current user, from the other side of
 * whichever thread(s) they can see. Works unmodified for either role: RLS's
 * messages_select already scopes visible rows to a student's own thread, or
 * a mentor's assigned students' threads — so "sender isn't me, unread" is
 * exactly the right filter regardless of which one you are.
 *
 * Re-checks on route change (catches visiting a thread on a fresh
 * navigation) and on MESSAGES_READ_EVENT (catches reading a thread that
 * was already open, e.g. new messages arriving via useMessageThread's own
 * refresh) — without the latter the badge would sit stale until whatever
 * navigation happened to come next, instead of clearing right away like a
 * normal messaging app.
 */
export function useUnreadMessages() {
  const { user } = useAuth()
  const location = useLocation()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }
    const { count: c } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .is('read_at', null)
    setCount(c ?? 0)
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

  return count
}
