import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PublicNav from '@/components/layout/PublicNav'

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
    <div className="min-h-screen bg-white">
      <PublicNav />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">The curriculum</h1>
        <p className="mt-3 text-slate-600">
          Twelve weeks, self-paced. Each week unlocks once you finish the one before it.
        </p>

        {loading && <p className="mt-10 text-sm text-slate-500">Loading curriculum…</p>}
        {error && <p className="mt-10 text-sm text-red-600">Couldn't load the curriculum: {error}</p>}

        {!loading && !error && (
          <ol className="mt-10 space-y-4">
            {weeks.map((week) => (
              <li
                key={week.week_position}
                className="flex gap-4 rounded-lg border border-slate-200 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {week.week_position}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{week.week_title}</h2>
                  {week.week_goal && <p className="mt-1 text-sm text-slate-600">{week.week_goal}</p>}
                  {week.estimated_hours && (
                    <p className="mt-1 text-xs text-slate-400">~{week.estimated_hours} hours</p>
                  )}
                </div>
              </li>
            ))}
            {weeks.length === 0 && (
              <p className="text-sm text-slate-500">Curriculum is being finalized — check back soon.</p>
            )}
          </ol>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/signup"
            className="inline-block rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Start week one
          </Link>
        </div>
      </main>
    </div>
  )
}
