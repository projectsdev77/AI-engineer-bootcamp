import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Lesson, Resource } from '@/types/database'

export interface ResourceWithProgress extends Resource {
  checked: boolean
}

export function useLessonDetail(lessonId: string | undefined) {
  const { user } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [resources, setResources] = useState<ResourceWithProgress[]>([])
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!lessonId || !user) return
    setLoading(true)
    setError(null)

    try {
      const [lessonRes, resourcesRes, progressRes, resourceProgressRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
        supabase.from('resources').select('*').eq('lesson_id', lessonId).order('position'),
        supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle(),
        supabase.from('resource_progress').select('resource_id').eq('user_id', user.id),
      ])

      if (lessonRes.error) throw lessonRes.error
      if (resourcesRes.error) throw resourcesRes.error
      if (progressRes.error) throw progressRes.error
      if (resourceProgressRes.error) throw resourceProgressRes.error

      const checkedIds = new Set((resourceProgressRes.data ?? []).map((r) => r.resource_id))

      setLesson(lessonRes.data as Lesson)
      setResources(
        ((resourcesRes.data ?? []) as Resource[]).map((r) => ({ ...r, checked: checkedIds.has(r.id) })),
      )
      setCompletedAt(progressRes.data?.completed_at ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lesson')
    } finally {
      setLoading(false)
    }
  }, [lessonId, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function toggleResource(resourceId: string, checked: boolean) {
    if (!user) return
    // Optimistic update; refresh() below reconciles with the server-computed
    // lesson_progress.completed_at once the auto-complete trigger has run.
    setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, checked } : r)))

    if (checked) {
      const { error } = await supabase
        .from('resource_progress')
        .insert({ user_id: user.id, resource_id: resourceId })
      if (error && error.code !== '23505') {
        // 23505 = unique_violation (already checked); anything else, revert.
        setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, checked: false } : r)))
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('resource_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('resource_id', resourceId)
      if (error) {
        setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, checked: true } : r)))
        setError(error.message)
        return
      }
    }

    const { data } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()
    setCompletedAt(data?.completed_at ?? null)
  }

  async function markCompleteManually() {
    if (!lessonId) return
    const { error } = await supabase.rpc('mark_lesson_complete', { p_lesson_id: lessonId })
    if (error) {
      setError(error.message)
      return
    }
    setCompletedAt(new Date().toISOString())
  }

  return { lesson, resources, completedAt, loading, error, toggleResource, markCompleteManually, refresh }
}
