import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import ProgressBar from '@/components/ui/ProgressBar'
import MessageThread from '@/components/messages/MessageThread'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useProgressOverview } from '@/hooks/useProgressOverview'
import type { Submission } from '@/types/database'

interface RecentSubmission extends Submission {
  assignmentTitle: string
}

function useRecentSubmissions(studentId: string | undefined) {
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    let active = true
    setLoading(true)
    ;(async () => {
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(10)
      const assignmentIds = [...new Set((subs ?? []).map((s) => s.assignment_id))]
      const { data: assignments } = assignmentIds.length
        ? await supabase.from('assignments').select('id, title').in('id', assignmentIds)
        : { data: [] }
      const titleById = new Map((assignments ?? []).map((a) => [a.id, a.title]))
      if (active) {
        setSubmissions(
          ((subs ?? []) as Submission[]).map((s) => ({
            ...s,
            assignmentTitle: titleById.get(s.assignment_id) ?? 'Unknown assignment',
          })),
        )
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [studentId])

  return { submissions, loading }
}

const STATUS_CLASS: Record<string, string> = {
  passed: 'bg-green-100 text-green-700',
  needs_work: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-500',
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const { data, loading: progressLoading, error } = useProgressOverview(studentId)
  const { submissions, loading: submissionsLoading } = useRecentSubmissions(studentId)

  if (progressLoading) return <FullPageSpinner />

  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/mentor" className="text-sm text-slate-500 hover:text-slate-700">
          ← Your students
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {overall && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Overall progress</span>
              <span className="text-sm text-slate-500">{overallPercent}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar percent={overallPercent} />
            </div>
          </div>
        )}

        {data?.weeks && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.weeks.map((w) => (
              <div key={w.week_id} className="rounded-md border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-400">Week {w.position}</p>
                <p className="text-sm font-medium text-slate-700">
                  {w.unlocked ? `${w.lessons_completed}/${w.lessons_total} lessons` : 'Locked'}
                </p>
              </div>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent submissions
          </h2>
          <div className="mt-3 space-y-2">
            {submissionsLoading && <p className="text-sm text-slate-400">Loading…</p>}
            {!submissionsLoading && submissions.length === 0 && (
              <p className="text-sm text-slate-500">No submissions yet.</p>
            )}
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.assignmentTitle}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(s.submitted_at).toLocaleDateString()} · attempt {s.attempt_number}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[s.final_status]}`}>
                  {s.final_status === 'pending' ? 'Pending' : s.final_status === 'passed' ? 'Passed' : 'Needs work'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Messages</h2>
          <div className="mt-3">{studentId && <MessageThread studentId={studentId} />}</div>
        </section>
      </main>
    </div>
  )
}
