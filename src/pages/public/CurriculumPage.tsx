import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  const { hash } = useLocation()

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

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

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

        {/* example assignment */}
        <section id="example-assignment" className="mt-20 scroll-mt-24">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ see an assignment ]</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink">What an assignment looks like</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            Every week ends with a real assignment — a quiz, a written response, or a link to something you built.
            Here's an example from week two.
          </p>

          <div className="mt-8 overflow-hidden rounded-panel border-2 border-ink">
            <div className="border-b-2 border-ink bg-stone px-6 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                week 02 · prompt engineering and context design
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">
                Write a system prompt for a support-ticket triage assistant
              </h3>
            </div>
            <div className="space-y-4 bg-surface px-6 py-6">
              <p className="text-[14.5px] leading-relaxed text-ink/80">
                Submit a system prompt (as text) that instructs an LLM to classify incoming support tickets by
                urgency and route them to the right team. It should handle ambiguous tickets gracefully and avoid
                leaking internal routing logic to the end user.
              </p>
              <div className="flex flex-wrap gap-2">
                {['clarity of instructions', 'handles edge cases', 'follows the rubric'].map((tag) => (
                  <span key={tag} className="pill pill-locked">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="callout callout-pass">
                <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-pass-ink">
                  AI feedback · delivered in seconds
                </p>
                <p className="mt-2 text-[14px] leading-relaxed">
                  "Strong structure — you separated the classification rule from the tone instructions clearly.
                  One gap: you don't say what to do when urgency is genuinely unclear. Add a fallback rule (e.g.
                  default to 'needs human triage') so the assistant never guesses silently."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* how review works */}
        <section id="how-review-works" className="mt-20 scroll-mt-24">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ how review works ]</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink">Two layers of feedback</h2>
          <ol className="mt-8 space-y-3">
            {[
              {
                step: 'You submit',
                body: 'A quiz, a written answer, or a link to what you built — whatever the assignment calls for.',
              },
              {
                step: 'AI grades it against a rubric',
                body: 'Gemini reads your submission (and, for links, the actual content behind it) against the same rubric a mentor would use, and returns structured, specific feedback — usually in under a minute.',
              },
              {
                step: 'Ask a mentor if you want a second read',
                body: "Disagree with the AI, or just want a human opinion? Flag it for review and it lands in a mentor's queue — a person reads your work and responds.",
              },
            ].map((row, i) => (
              <li key={row.step} className="card flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-lime font-mono text-sm font-bold text-ink">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{row.step}</h3>
                  <p className="mt-1 text-[14.5px] text-muted">{row.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-20 rounded-panel border-2 border-ink bg-ink px-8 py-10 text-center">
          <h2 className="font-display text-2xl font-bold text-paper">Ready to start week one?</h2>
          <LinkButton to="/signup" variant="primary" className="mt-6">
            Start week one
          </LinkButton>
        </div>
      </main>
    </div>
  )
}
