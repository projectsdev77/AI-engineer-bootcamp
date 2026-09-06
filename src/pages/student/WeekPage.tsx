import { Link, useParams } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import Callout from '@/components/ui/Callout'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusPill, { type StatusVariant } from '@/components/ui/StatusPill'
import { AssignmentIcon, LockIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useWeekDetail, type AssignmentSummary, type LessonSummary } from '@/hooks/useWeekDetail'

const ASSIGNMENT_STATUS: Record<string, { label: string; variant: StatusVariant }> = {
  passed: { label: 'passed', variant: 'pass' },
  needs_work: { label: 'needs work', variant: 'warn' },
  pending: { label: 'awaiting feedback', variant: 'progress' },
}

function LessonRow({ weekId, lesson }: { weekId: string; lesson: LessonSummary }) {
  const percent =
    lesson.requiredTotal > 0 ? Math.round((lesson.requiredChecked / lesson.requiredTotal) * 100) : 0

  return (
    <Link to={`/weeks/${weekId}/lessons/${lesson.id}`} className="block no-underline">
      <Card className="flex items-center gap-4 hover:shadow-app">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border-2 font-mono text-xs font-bold ${
            lesson.completed ? 'border-pass bg-pass-bg text-pass-ink' : 'border-ink bg-stone text-ink'
          }`}
        >
          {lesson.completed ? '✓' : lesson.position}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{lesson.title}</p>
          {lesson.requiredTotal > 0 ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="max-w-[10rem] flex-1">
                <ProgressBar percent={percent} />
              </div>
              <span className="font-mono text-[11px] font-bold text-muted">
                {lesson.requiredChecked}/{lesson.requiredTotal}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-faint">No resources — mark complete manually</p>
          )}
        </div>
        {lesson.estimated_minutes && (
          <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wide text-faint">
            {lesson.estimated_minutes} min
          </span>
        )}
      </Card>
    </Link>
  )
}

function AssignmentRow({ weekId, assignment }: { weekId: string; assignment: AssignmentSummary }) {
  const status = assignment.latestStatus ? ASSIGNMENT_STATUS[assignment.latestStatus] : null
  return (
    <Link to={`/weeks/${weekId}/assignments/${assignment.id}`} className="block no-underline">
      <Card className="flex items-center justify-between gap-4 hover:shadow-app">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border-2 border-ink bg-lilac/40">
            <AssignmentIcon className="h-4 w-4 text-ink" />
          </span>
          <div>
            <p className="font-bold text-ink">{assignment.title}</p>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-faint">
              {assignment.assignment_type}
            </p>
          </div>
        </div>
        {status ? <StatusPill variant={status.variant}>{status.label}</StatusPill> : <StatusPill variant="locked">not started</StatusPill>}
      </Card>
    </Link>
  )
}

export default function WeekPage() {
  const { weekId } = useParams()
  const { week, lessons, assignments, loading, error } = useWeekDetail(weekId)

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      {week && <Breadcrumb items={[{ label: 'dashboard', to: '/dashboard' }, { label: `week ${week.position}` }]} />}

      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        {error && <p className="text-sm font-bold text-fail-ink">Couldn't load this week: {error}</p>}

        {week && (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
                [ week {week.position}{week.estimated_hours ? ` · ${week.estimated_hours} hrs` : ''} ]
              </p>
              <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">{week.title}</h1>
              {week.goal && <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{week.goal}</p>}

              <section className="mt-9">
                <p className="meta">Lessons</p>
                <div className="mt-3 space-y-3">
                  {lessons.map((lesson) => (
                    <LessonRow key={lesson.id} weekId={week.id} lesson={lesson} />
                  ))}
                  {lessons.length === 0 && <p className="text-sm text-muted">No lessons yet.</p>}
                </div>
              </section>

              {assignments.length > 0 && (
                <section className="mt-8">
                  <p className="meta">Assignments</p>
                  <div className="mt-3 space-y-3">
                    {assignments.map((assignment) => (
                      <AssignmentRow key={assignment.id} weekId={week.id} assignment={assignment} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <Card>
                <p className="meta">Week {week.position} contents</p>
                <ul className="mt-3 divide-y divide-hairline">
                  {lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 font-mono text-[10px] font-bold ${
                          lesson.completed ? 'border-pass bg-pass-bg text-pass-ink' : 'border-ink text-ink'
                        }`}
                      >
                        {lesson.completed ? '✓' : lesson.position}
                      </span>
                      <span className="text-[14px] text-ink">{lesson.title}</span>
                    </li>
                  ))}
                  {assignments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink bg-lilac/40">
                        <AssignmentIcon className="h-3 w-3 text-ink" />
                      </span>
                      <span className="text-[14px] text-ink">{a.title}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Callout tone="info" heading="how unlocking works" icon={<LockIcon className="h-3.5 w-3.5" />}>
                Check off every required resource in every lesson, then pass the week's assignment. The next week opens
                automatically.
              </Callout>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
