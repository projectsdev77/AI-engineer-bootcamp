import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { AssignmentType, SubmissionStatus, Week } from '@/types/database'

export interface LessonSummary {
  id: string
  position: number
  title: string
  slug: string
  estimated_minutes: number | null
  completed: boolean
  requiredTotal: number
  requiredChecked: number
}

export interface AssignmentSummary {
  id: string
  position: number
  title: string
  assignment_type: AssignmentType
  latestStatus: SubmissionStatus | null // null = no submission yet
}

export function useWeekDetail(weekId: string | undefined) {
  const { user } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!weekId || !user) return
    setLoading(true)
    setError(null)

    try {
      const [weekRes, lessonsRes, assignmentsRes] = await Promise.all([
        supabase.from('weeks').select('*').eq('id', weekId).single(),
        supabase
          .from('lessons')
          .select('id, position, title, slug, estimated_minutes')
          .eq('week_id', weekId)
          .eq('status', 'published')
          .order('position'),
        supabase
          .from('assignments')
          .select('id, position, title, assignment_type')
          .eq('week_id', weekId)
          .eq('status', 'published')
          .order('position'),
      ])

      if (weekRes.error) throw weekRes.error
      if (lessonsRes.error) throw lessonsRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      setWeek(weekRes.data as Week)

      const lessonIds = (lessonsRes.data ?? []).map((l) => l.id)
      const [progressRes, requiredResourcesRes] = await Promise.all([
        lessonIds.length
          ? supabase
              .from('lesson_progress')
              .select('lesson_id, completed_at')
              .eq('user_id', user.id)
              .in('lesson_id', lessonIds)
          : Promise.resolve({ data: [], error: null }),
        lessonIds.length
          ? supabase
              .from('resources')
              .select('id, lesson_id')
              .in('lesson_id', lessonIds)
              .eq('is_required', true)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (progressRes.error) throw progressRes.error
      if (requiredResourcesRes.error) throw requiredResourcesRes.error

      const completedLessonIds = new Set(
        (progressRes.data ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id),
      )

      const requiredResourceIds = (requiredResourcesRes.data ?? []).map((r) => r.id)
      const checkedRes = requiredResourceIds.length
        ? await supabase
            .from('resource_progress')
            .select('resource_id')
            .eq('user_id', user.id)
            .in('resource_id', requiredResourceIds)
        : { data: [], error: null }
      if (checkedRes.error) throw checkedRes.error
      const checkedResourceIds = new Set((checkedRes.data ?? []).map((r) => r.resource_id))

      const requiredTotals = new Map<string, number>()
      const requiredChecked = new Map<string, number>()
      for (const r of requiredResourcesRes.data ?? []) {
        requiredTotals.set(r.lesson_id, (requiredTotals.get(r.lesson_id) ?? 0) + 1)
        if (checkedResourceIds.has(r.id)) {
          requiredChecked.set(r.lesson_id, (requiredChecked.get(r.lesson_id) ?? 0) + 1)
        }
      }

      setLessons(
        (lessonsRes.data ?? []).map((l) => ({
          ...l,
          completed: completedLessonIds.has(l.id),
          requiredTotal: requiredTotals.get(l.id) ?? 0,
          requiredChecked: requiredChecked.get(l.id) ?? 0,
        })),
      )

      const assignmentIds = (assignmentsRes.data ?? []).map((a) => a.id)
      const submissionsRes = assignmentIds.length
        ? await supabase
            .from('submissions')
            .select('assignment_id, attempt_number, final_status')
            .eq('user_id', user.id)
            .in('assignment_id', assignmentIds)
            .order('attempt_number', { ascending: false })
        : { data: [], error: null }
      if (submissionsRes.error) throw submissionsRes.error

      const latestStatusByAssignment = new Map<string, SubmissionStatus>()
      for (const s of submissionsRes.data ?? []) {
        if (!latestStatusByAssignment.has(s.assignment_id)) {
          latestStatusByAssignment.set(s.assignment_id, s.final_status)
        }
      }

      setAssignments(
        (assignmentsRes.data ?? []).map((a) => ({
          ...a,
          latestStatus: latestStatusByAssignment.get(a.id) ?? null,
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load week')
    } finally {
      setLoading(false)
    }
  }, [weekId, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { week, lessons, assignments, loading, error, refresh }
}
