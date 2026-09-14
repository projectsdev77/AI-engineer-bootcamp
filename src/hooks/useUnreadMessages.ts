import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/**
 * Count of messages waiting on the current user, from the other side of
 * whichever thread(s) they can see. Works unmodified for either role: RLS's
 * messages_select already scopes visible rows to a student's own thread, or
 * a mentor's assigned students' threads — so "sender isn't me, unread" is
 * exactly the right filter regardless of which one you are.
 *
 * Re-checks on every route change rather than polling, since visiting a
 * thread (useMessageThread) is what marks messages read — this just needs
 * to notice that happened after the fact, not stay live second-to-second.
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
    // Re-check on navigation (not just when `refresh` itself changes) so
    // the badge clears shortly after visiting the thread that just marked
    // its messages read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, location.pathname])

  return count
}
