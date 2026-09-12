import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusPill, { type StatusVariant } from '@/components/ui/StatusPill'
import MessageThread from '@/components/messages/MessageThread'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useProgressOverview } from '@/hooks/useProgressOverview'
import { useWeeklyHours } from '@/hooks/useWeeklyHours'
import type { Submission } from '@/types/database'

interface StudentProfile {
  full_name: string | null
  background: string | null
  weekly_hours_target: number | null
}

function useStudentProfile(studentId: string | undefined) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)

  useEffect(() => {
    if (!studentId) return
    let active = true
    void supabase
      .from('profiles')
      .select('full_name, background, weekly_hours_target')
      .eq('id', studentId)
      .single()
      .then(({ data }) => {
        if (active) setProfile(data as StudentProfile | null)
      })
    return () => {
      active = false
    }
  }, [studentId])

  return profile
}

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

const STATUS_VARIANT: Record<string, StatusVariant> = {
  passed: 'pass',
  needs_work: 'warn',
  pending: 'progress',
}
const STATUS_LABEL: Record<string, string> = { passed: 'passed', needs_work: 'needs work', pending: 'pending' }

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const { data, loading: progressLoading, error } = useProgressOverview(studentId)
  const { submissions, loading: submissionsLoading } = useRecentSubmissions(studentId)
  const { data: weeklyHours } = useWeeklyHours(studentId)
  const studentProfile = useStudentProfile(studentId)

  if (progressLoading) return <FullPageSpinner />

  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <Breadcrumb
        items={[{ label: 'your students', to: '/mentor' }, { label: studentProfile?.full_name?.toLowerCase() ?? 'student' }]}
      />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}

        {studentProfile && (studentProfile.background || studentProfile.weekly_hours_target != null) && (
          <Card className="mb-6">
            <p className="meta">About this student</p>
            {studentProfile.background && (
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{studentProfile.background}</p>
            )}
            {studentProfile.weekly_hours_target != null && (
              <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                Aiming for {studentProfile.weekly_hours_target} hrs/week
                {weeklyHours && ` · ${(weeklyHours.logged_minutes / 60).toFixed(1)} logged this week`}
              </p>
            )}
          </Card>
        )}

        {overall && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="meta">Overall progress</span>
              <span className="font-display text-2xl font-bold text-ink">{overallPercent}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar percent={overallPercent} tone="ink" />
            </div>
          </Card>
        )}

        {data?.weeks && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.weeks.map((w) => (
              <div
                key={w.week_id}
                className={`rounded-card border-2 p-3 text-center ${w.unlocked ? 'border-ink bg-surface' : 'border-disabled bg-stone'}`}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-faint">Week {w.position}</p>
                <p className="mt-1 text-[13px] font-bold text-ink">
                  {w.unlocked ? `${w.lessons_completed}/${w.lessons_total}` : 'Locked'}
                </p>
              </div>
            ))}
          </div>
        )}

        <section className="mt-9">
          <p className="meta">Recent submissions</p>
          <div className="mt-3 space-y-3">
            {submissionsLoading && <p className="font-mono text-xs font-bold uppercase text-muted">loading…</p>}
            {!submissionsLoading && submissions.length === 0 && (
              <p className="text-[14.5px] text-muted">No submissions yet.</p>
            )}
            {submissions.map((s) => (
              <Card key={s.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">{s.assignmentTitle}</p>
                  <p className="font-mono text-[11px] text-faint">
                    {new Date(s.submitted_at).toLocaleDateString()} · attempt {s.attempt_number}
                  </p>
                </div>
                <StatusPill variant={STATUS_VARIANT[s.final_status]}>{STATUS_LABEL[s.final_status]}</StatusPill>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <p className="meta">Messages</p>
          <div className="mt-3">{studentId && <MessageThread studentId={studentId} />}</div>
        </section>

        <Link to="/mentor" className="mt-8 inline-block font-mono text-xs font-bold uppercase tracking-wide text-blue-700">
          ← back to your students
        </Link>
      </main>
    </div>
  )
}
