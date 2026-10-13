import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SkillProgress } from '@/hooks/useProgressOverview'

/** Per-skill mastery across the track. Pass `targetUserId` for an assigned student (mentor) or any student (admin). */
export function useSkillProgress(targetUserId?: string) {
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void supabase
      .rpc('get_skill_progress', targetUserId ? { p_target_user_id: targetUserId } : {})
      .then(({ data }) => {
        if (cancelled) return
        setSkills((data ?? []) as SkillProgress[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [targetUserId])

  return { skills, loading }
}
