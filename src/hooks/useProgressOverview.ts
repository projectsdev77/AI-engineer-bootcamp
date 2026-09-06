import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface WeekProgress {
  week_id: string
  position: number
  title: string
  goal: string | null
  unlocked: boolean
  lessons_total: number
  lessons_completed: number
  assignments_total: number
  assignments_done: number
}

export interface ProgressOverview {
  enrolled: boolean
  track_id?: string
  overall?: { resources_completed: number; resources_total: number }
  weeks?: WeekProgress[]
}

/** Whether a week's own lessons+assignments are all done (unlocking week N+1). */
export function isWeekComplete(week: WeekProgress): boolean {
  return (
    week.lessons_completed >= week.lessons_total && week.assignments_done >= week.assignments_total
  )
}

/** The unlocked week the student should land on: first unfinished one, else the last unlocked one. */
export function currentWeek(weeks: WeekProgress[]): WeekProgress | undefined {
  const unlocked = weeks.filter((w) => w.unlocked)
  return unlocked.find((w) => !isWeekComplete(w)) ?? unlocked[unlocked.length - 1]
}

export function useProgressOverview() {
  const [data, setData] = useState<ProgressOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_progress_overview')
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setData(data as ProgressOverview)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
