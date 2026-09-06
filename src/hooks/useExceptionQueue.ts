import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Submission } from '@/types/database'

export interface QueueItem extends Submission {
  studentName: string
  assignmentTitle: string
  weekTitle: string
  weekPosition: number
}

/**
 * The exception queue (PD-002): submissions that failed AI evaluation or
 * that a student flagged for a second look. RLS scopes the underlying
 * `submissions` select automatically — a mentor only ever gets rows for
 * their assigned students, an admin gets everyone's — so this hook doesn't
 * need to know which role is calling it.
 */
export function useExceptionQueue() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: submissions, error: subErr } = await supabase
        .from('submissions')
        .select('*')
        .or('evaluation_status.eq.failed,flagged_for_review_at.not.is.null')
        .order('submitted_at', { ascending: false })
      if (subErr) throw subErr

      const rows = submissions ?? []
      const userIds = [...new Set(rows.map((s) => s.user_id))]
      const assignmentIds = [...new Set(rows.map((s) => s.assignment_id))]

      const [profilesRes, assignmentsRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        assignmentIds.length
          ? supabase.from('assignments').select('id, title, week_id').in('id', assignmentIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (profilesRes.error) throw profilesRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      const weekIds = [...new Set((assignmentsRes.data ?? []).map((a) => a.week_id))]
      const weeksRes = weekIds.length
        ? await supabase.from('weeks').select('id, title, position').in('id', weekIds)
        : { data: [], error: null }
      if (weeksRes.error) throw weeksRes.error

      const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? 'Unnamed student']))
      const assignmentById = new Map((assignmentsRes.data ?? []).map((a) => [a.id, a]))
      const weekById = new Map((weeksRes.data ?? []).map((w) => [w.id, w]))

      setItems(
        rows.map((s) => {
          const assignment = assignmentById.get(s.assignment_id)
          const week = assignment ? weekById.get(assignment.week_id) : undefined
          return {
            ...s,
            studentName: nameById.get(s.user_id) ?? 'Unknown',
            assignmentTitle: assignment?.title ?? 'Unknown assignment',
            weekTitle: week?.title ?? '',
            weekPosition: week?.position ?? 0,
          }
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function resolve(submissionId: string, status: 'passed' | 'needs_work', feedback: string) {
    const { error } = await supabase.rpc('override_submission_status', {
      p_submission_id: submissionId,
      p_final_status: status,
      p_human_feedback: feedback,
    })
    if (error) {
      setError(error.message)
      return false
    }
    await refresh()
    return true
  }

  const open = items.filter((i) => !i.reviewed_at)
  const resolved = items.filter((i) => i.reviewed_at)

  return { open, resolved, loading, error, resolve, refresh }
}
