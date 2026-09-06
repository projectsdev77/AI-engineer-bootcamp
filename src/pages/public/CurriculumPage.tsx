import { useEffect, useState } from 'react'
import PublicNav from '@/components/layout/PublicNav'
import { LinkButton } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface PublicWeek {
  track_title: string
  week_position: number
  week_title: string
  week_goal: string | null
  week_summary: string | null
  estimated_hours: number | null
}

export default function CurriculumPage() {
  const [weeks, setWeeks] = useState<PublicWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .rpc('public_curriculum_overview')
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setError(error.message)
        } else {
          setWeeks((data ?? []) as PublicWeek[])
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <main className="mx-auto max-w-[880px] px-4 py-16 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ the full path ]</p>
        <h1 className="mt-3 font-display text-[44px] font-bold leading-[0.98] tracking-[-0.03em] text-ink sm:text-[56px]">
          The curriculum
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted">
          Twelve weeks, self-paced. Each week unlocks once you finish the one before it.
        </p>

        {loading && <p className="mt-10 font-mono text-xs font-bold uppercase tracking-wide text-muted">loading…</p>}
        {error && <p className="mt-10 text-sm font-bold text-fail-ink">Couldn't load the curriculum: {error}</p>}

        {!loading && !error && (
          <ol className="mt-10 space-y-3">
            {weeks.map((week) => (
              <li key={week.week_position} className="card flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-stone font-mono text-sm font-bold text-ink">
                  {String(week.week_position).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">{week.week_title}</h2>
                  {week.week_goal && <p className="mt-1 text-[14.5px] text-muted">{week.week_goal}</p>}
                  {week.estimated_hours && (
                    <p className="mt-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                      ~{week.estimated_hours} hrs
                    </p>
                  )}
                </div>
              </li>
            ))}
            {weeks.length === 0 && (
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">
                Curriculum is being finalized — check back soon.
              </p>
            )}
          </ol>
        )}

        <div className="mt-14 rounded-panel border-2 border-ink bg-ink px-8 py-10 text-center">
          <h2 className="font-display text-2xl font-bold text-paper">Ready to start week one?</h2>
          <LinkButton to="/signup" variant="primary" className="mt-6">
            Start week one
          </LinkButton>
        </div>
      </main>
    </div>
  )
}
