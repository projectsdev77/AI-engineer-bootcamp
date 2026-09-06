import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { currentWeek, isWeekComplete, useProgressOverview, type WeekProgress } from '@/hooks/useProgressOverview'
import AppNav from '@/components/layout/AppNav'
import ProgressBar from '@/components/ui/ProgressBar'
import { FullPageSpinner } from '@/routes/ProtectedRoute'

function WeekRow({ week, isCurrent }: { week: WeekProgress; isCurrent: boolean }) {
  const totalUnits = week.lessons_total + week.assignments_total
  const doneUnits = week.lessons_completed + week.assignments_done
  const percent = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0
  const complete = isWeekComplete(week) && totalUnits > 0

  const content = (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 ${
        week.unlocked ? 'border-slate-200 bg-white hover:border-brand-300' : 'border-slate-100 bg-slate-50'
      } ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          complete
            ? 'bg-green-100 text-green-700'
            : week.unlocked
              ? 'bg-brand-50 text-brand-700'
              : 'bg-slate-200 text-slate-400'
        }`}
      >
        {complete ? '✓' : week.unlocked ? week.position : '🔒'}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${week.unlocked ? 'text-slate-900' : 'text-slate-400'}`}>
          Week {week.position}: {week.title}
        </p>
        {week.unlocked ? (
          <>
            {week.goal && <p className="mt-0.5 truncate text-sm text-slate-500">{week.goal}</p>}
            <div className="mt-2 max-w-xs">
              <ProgressBar percent={percent} />
            </div>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-slate-400">Locked — finish the previous week first</p>
        )}
      </div>
    </div>
  )

  if (!week.unlocked) return content
  return (
    <Link to={`/weeks/${week.week_id}`} className="block">
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data, loading, error } = useProgressOverview()

  if (loading) return <FullPageSpinner />

  const weeks = data?.weeks ?? []
  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0
  const active = currentWeek(weeks)

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>

        {error && <p className="mt-4 text-sm text-red-600">Couldn't load your progress: {error}</p>}

        {!error && data?.enrolled === false && (
          <p className="mt-4 text-sm text-slate-600">You're not enrolled yet — this shouldn't happen; contact support.</p>
        )}

        {overall && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Overall progress</span>
              <span className="text-sm text-slate-500">{overallPercent}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar percent={overallPercent} />
            </div>
          </div>
        )}

        {active && (
          <div className="mt-6 flex items-center justify-between rounded-lg bg-brand-600 p-5 text-white">
            <div>
              <p className="text-sm text-brand-100">Continue where you left off</p>
              <p className="text-lg font-semibold">Week {active.position}: {active.title}</p>
            </div>
            <Link
              to={`/weeks/${active.week_id}`}
              className="shrink-0 rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Continue
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {weeks.map((week) => (
            <WeekRow key={week.week_id} week={week} isCurrent={week.week_id === active?.week_id} />
          ))}
        </div>
      </main>
    </div>
  )
}
