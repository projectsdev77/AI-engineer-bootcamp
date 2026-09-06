import { Link, useParams } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import ProgressBar from '@/components/ui/ProgressBar'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useWeekDetail, type AssignmentSummary, type LessonSummary } from '@/hooks/useWeekDetail'

const ASSIGNMENT_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  passed: { label: 'Passed', className: 'bg-green-100 text-green-700' },
  needs_work: { label: 'Needs work', className: 'bg-amber-100 text-amber-700' },
  pending: { label: 'Awaiting feedback', className: 'bg-slate-100 text-slate-600' },
}

function LessonRow({ weekId, lesson }: { weekId: string; lesson: LessonSummary }) {
  const percent =
    lesson.requiredTotal > 0 ? Math.round((lesson.requiredChecked / lesson.requiredTotal) * 100) : 0

  return (
    <Link
      to={`/weeks/${weekId}/lessons/${lesson.id}`}
      className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          lesson.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {lesson.completed ? '✓' : lesson.position}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{lesson.title}</p>
        {lesson.requiredTotal > 0 ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="max-w-[10rem] flex-1">
              <ProgressBar percent={percent} />
            </div>
            <span className="text-xs text-slate-500">
              {lesson.requiredChecked}/{lesson.requiredTotal} resources
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">No resources — mark complete manually</p>
        )}
      </div>
      {lesson.estimated_minutes && (
        <span className="shrink-0 text-xs text-slate-400">{lesson.estimated_minutes} min</span>
      )}
    </Link>
  )
}

function AssignmentRow({ weekId, assignment }: { weekId: string; assignment: AssignmentSummary }) {
  const status = assignment.latestStatus ? ASSIGNMENT_STATUS_LABEL[assignment.latestStatus] : null
  return (
    <Link
      to={`/weeks/${weekId}/assignments/${assignment.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
    >
      <div>
        <p className="font-medium text-slate-900">{assignment.title}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400">{assignment.assignment_type}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
          status ? status.className : 'bg-slate-100 text-slate-500'
        }`}
      >
        {status ? status.label : 'Not started'}
      </span>
    </Link>
  )
}

export default function WeekPage() {
  const { weekId } = useParams()
  const { week, lessons, assignments, loading, error } = useWeekDetail(weekId)

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Dashboard
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">Couldn't load this week: {error}</p>}

        {week && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Week {week.position}: {week.title}
            </h1>
            {week.goal && <p className="mt-2 text-slate-600">{week.goal}</p>}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lessons</h2>
              <div className="mt-3 space-y-3">
                {lessons.map((lesson) => (
                  <LessonRow key={lesson.id} weekId={week.id} lesson={lesson} />
                ))}
                {lessons.length === 0 && <p className="text-sm text-slate-500">No lessons yet.</p>}
              </div>
            </section>

            {assignments.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Assignments
                </h2>
                <div className="mt-3 space-y-3">
                  {assignments.map((assignment) => (
                    <AssignmentRow key={assignment.id} weekId={week.id} assignment={assignment} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
