import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface MentorStudent {
  id: string
  full_name: string | null
  last_active_at: string | null
  assigned_at: string
}

export function useMentorStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState<MentorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: assignments, error: assignErr } = await supabase
        .from('mentor_assignments')
        .select('student_id, assigned_at')
        .eq('mentor_id', user.id)
        .eq('is_active', true)
      if (assignErr) throw assignErr

      const studentIds = (assignments ?? []).map((a) => a.student_id)
      const profilesRes = studentIds.length
        ? await supabase.from('profiles').select('id, full_name, last_active_at').in('id', studentIds)
        : { data: [], error: null }
      if (profilesRes.error) throw profilesRes.error

      const assignedAtById = new Map((assignments ?? []).map((a) => [a.student_id, a.assigned_at]))
      setStudents(
        (profilesRes.data ?? []).map((p) => ({
          ...p,
          assigned_at: assignedAtById.get(p.id) ?? '',
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { students, loading, error, refresh }
}
