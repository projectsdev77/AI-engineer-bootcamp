import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { currentWeek, isWeekComplete, useProgressOverview, type WeekProgress } from '@/hooks/useProgressOverview'
import { useMyCertificate } from '@/hooks/useMyCertificate'
import AppNav from '@/components/layout/AppNav'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusPill from '@/components/ui/StatusPill'
import { LinkButton } from '@/components/ui/Button'
import { StarIcon, LockIcon } from '@/components/ui/icons'
import { IllComplete } from '@/components/ui/illustrations'
import { FullPageSpinner } from '@/routes/ProtectedRoute'

function WeekRow({ week, isCurrent }: { week: WeekProgress; isCurrent: boolean }) {
  const totalUnits = week.lessons_total + week.assignments_total
  const doneUnits = week.lessons_completed + week.assignments_done
  const percent = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0
  const complete = isWeekComplete(week) && totalUnits > 0

  const content = (
    <div className={`card flex items-center gap-4 ${!week.unlocked ? 'card-locked' : ''} ${isCurrent ? 'card-active' : ''}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-2 font-mono text-sm font-bold ${
          complete
            ? 'border-pass bg-pass-bg text-pass-ink'
            : week.unlocked
              ? 'border-ink bg-lime text-ink'
              : 'border-disabled bg-stone text-faint'
        }`}
      >
        {complete ? '✓' : week.unlocked ? week.position : <LockIcon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-display text-lg font-bold ${week.unlocked ? 'text-ink' : 'text-faint'}`}>
          Week {week.position}: {week.title}
        </p>
        {week.unlocked ? (
          <>
            {week.goal && <p className="mt-0.5 truncate text-[14.5px] text-muted">{week.goal}</p>}
            <div className="mt-2.5 flex max-w-xs items-center gap-3">
              <ProgressBar percent={percent} />
              <span className="shrink-0 font-mono text-[11px] font-bold text-muted">{doneUnits}/{totalUnits || 0}</span>
            </div>
          </>
        ) : (
          <p className="mt-0.5 text-[14.5px] text-faint">Locked — finish the previous week first</p>
        )}
      </div>
      <span className="shrink-0">
        {complete && <StatusPill variant="pass">complete</StatusPill>}
        {!complete && week.unlocked && <StatusPill variant="progress">in progress</StatusPill>}
        {!week.unlocked && <StatusPill variant="locked">locked</StatusPill>}
      </span>
    </div>
  )

  if (!week.unlocked) return content
  return (
    <Link to={`/weeks/${week.week_id}`} className="block no-underline">
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data, loading, error } = useProgressOverview()
  const certificateCode = useMyCertificate()

  if (loading) return <FullPageSpinner />

  const weeks = data?.weeks ?? []
  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0
  const active = currentWeek(weeks)
  const lessonsTotal = weeks.reduce((sum, w) => sum + w.lessons_total, 0)
  const lessonsCompleted = weeks.reduce((sum, w) => sum + w.lessons_completed, 0)
  const submissionsCount = weeks.reduce((sum, w) => sum + w.assignments_done, 0)

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
          [ week {active?.position ?? '—'} of 12 · {overallPercent}% complete ]
        </p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>

        {error && (
          <p className="mt-4 text-sm font-bold text-fail-ink">Couldn't load your progress: {error}</p>
        )}
        {!error && data?.enrolled === false && (
          <p className="mt-4 text-sm text-muted">You're not enrolled yet — this shouldn't happen; contact support.</p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            {active && (
              <div className="flex flex-col gap-4 rounded-panel border-2 border-ink bg-ink p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                    Continue where you left off
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-paper">
                    Week {active.position}: {active.title}
                  </p>
                </div>
                <LinkButton to={`/weeks/${active.week_id}`} variant="primary" className="shrink-0">
                  Continue
                </LinkButton>
              </div>
            )}

            <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">Twelve weeks</p>
            <div className="mt-3 space-y-3">
              {weeks.map((week) => (
                <WeekRow key={week.week_id} week={week} isCurrent={week.week_id === active?.week_id} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {certificateCode && (
              <div className="rounded-panel border-2 border-ink bg-lime p-6">
                <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
                  <StarIcon className="h-3.5 w-3.5" /> track complete
                </p>
                <div className="ill-frame mt-4 aspect-[25/12] text-ink">
                  <IllComplete />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">You completed the track!</p>
                <p className="mt-1 text-[14.5px] text-ink/70">Your certificate is ready to share.</p>
                <LinkButton to={`/certificates/${certificateCode}`} variant="site" className="mt-4 w-full">
                  View certificate
                </LinkButton>
              </div>
            )}

            {overall && (
              <div className="card">
                <p className="meta">Overall progress</p>
                <p className="mt-2 font-display text-5xl font-bold text-ink">
                  {overallPercent}
                  <span className="text-2xl">%</span>
                </p>
                <div className="mt-3">
                  <ProgressBar percent={overallPercent} tone="ink" />
                </div>
                <dl className="mt-5 space-y-2 border-t-2 border-hairline pt-4 text-[13.5px]">
                  <div className="flex justify-between">
                    <dt className="meta">Lessons done</dt>
                    <dd className="font-bold text-ink">
                      {lessonsCompleted}/{lessonsTotal}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="meta">Submissions</dt>
                    <dd className="font-bold text-ink">{submissionsCount}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
