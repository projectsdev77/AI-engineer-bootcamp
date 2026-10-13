import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SkillProgress } from '@/hooks/useProgressOverview'

/** The signed-in student's per-skill mastery across their track. */
export function useSkillProgress() {
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void supabase
      .rpc('get_skill_progress')
      .then(({ data }) => {
        if (cancelled) return
        setSkills((data ?? []) as SkillProgress[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { skills, loading }
}
