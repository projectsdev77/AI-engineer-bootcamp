import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PaymentStatus } from '@/types/database'

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
  payment_status?: PaymentStatus
  overall?: { resources_completed: number; resources_total: number }
  weeks?: WeekProgress[]
}

/** Whether a week's own lessons+assignments are all done (unlocking week N+1). */
export function isWeekComplete(week: WeekProgress): boolean {
  return (
    week.lessons_completed >= week.lessons_total && week.assignments_done >= week.assignments_total
  )
}

/**
 * A locked week that the student has actually earned (the previous week is
 * done) but isn't seeing because payment_status isn't 'paid' yet — week 1 is
 * always free, so this can only ever be true from week 2 on.
 */
export function isPaymentLocked(weeks: WeekProgress[], week: WeekProgress, paymentStatus?: PaymentStatus): boolean {
  if (week.unlocked || paymentStatus === 'paid' || week.position <= 1) return false
  const previous = weeks.find((w) => w.position === week.position - 1)
  return previous ? isWeekComplete(previous) : false
}

/** The unlocked week the student should land on: first unfinished one, else the last unlocked one. */
export function currentWeek(weeks: WeekProgress[]): WeekProgress | undefined {
  const unlocked = weeks.filter((w) => w.unlocked)
  return unlocked.find((w) => !isWeekComplete(w)) ?? unlocked[unlocked.length - 1]
}

/** Pass `targetUserId` to view another (mentor-assigned) student's progress; omit for your own. */
export function useProgressOverview(targetUserId?: string) {
  const [data, setData] = useState<ProgressOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    // Deliberately not setLoading(true) here: callers also invoke this
    // after mutations (marking paid, a manual week unlock, ...), and
    // flipping loading back to true on each of those would unmount the
    // whole page back to a full-page spinner every time, which reads as
    // the page reloading.
    const { data, error } = await supabase.rpc('get_progress_overview', {
      p_target_user_id: targetUserId ?? null,
    })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setData(data as ProgressOverview)
    }
    setLoading(false)
  }, [targetUserId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
