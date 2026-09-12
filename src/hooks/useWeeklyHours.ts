import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface WeeklyHoursProgress {
  target_hours: number | null
  logged_minutes: number
  week_start: string
}

/** Pass `targetUserId` to view another (mentor-assigned) student's hours; omit for your own. */
export function useWeeklyHours(targetUserId?: string) {
  const [data, setData] = useState<WeeklyHoursProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_weekly_hours_progress', {
      p_target_user_id: targetUserId ?? null,
    })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setData(data as WeeklyHoursProgress)
    }
    setLoading(false)
  }, [targetUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
