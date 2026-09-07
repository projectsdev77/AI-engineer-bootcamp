import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import Callout from '@/components/ui/Callout'
import StatusPill from '@/components/ui/StatusPill'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { AssignmentIcon, LockIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useLessonDetail, type ResourceWithProgress } from '@/hooks/useLessonDetail'
import { useWeekDetail } from '@/hooks/useWeekDetail'

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  article: 'Article',
  docs: 'Docs',
  paper: 'Paper',
  repo: 'Repo',
  tool: 'Tool',
  other: 'Resource',
}

function ResourceRow({
  resource,
  onToggle,
}: {
  resource: ResourceWithProgress
  onToggle: (checked: boolean) => void
}) {
  return (
    <li className={`rounded-card border-2 p-4 ${resource.is_required ? 'border-ink bg-surface' : 'border-dashed border-disabled bg-transparent'}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={resource.checked} onChange={onToggle} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className={`font-bold no-underline hover:underline ${resource.checked ? 'text-faint line-through' : 'text-ink'}`}
            >
              {resource.title}
            </a>
            <a href={resource.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] font-bold uppercase text-blue-700">
              open ↗
            </a>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
              {RESOURCE_TYPE_LABEL[resource.resource_type] ?? resource.resource_type}
            </span>
            {resource.source_name && <span className="font-mono text-[11px] text-faint">{resource.source_name}</span>}
            {resource.estimated_minutes && <span className="font-mono text-[11px] text-faint">{resource.estimated_minutes} min</span>}
            {!resource.is_required && (
              <span className="font-mono text-[11px] font-bold uppercase text-faint">Optional</span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function LessonPage() {
  const { lessonId, weekId } = useParams()
  const navigate = useNavigate()
  const { lesson, resources, completedAt, loading, error, toggleResource, markCompleteManually } =
    useLessonDetail(lessonId)
  const { week, lessons, assignments } = useWeekDetail(weekId)

  if (loading) return <FullPageSpinner />

  const requiredResources = resources.filter((r) => r.is_required)
  const doneCount = requiredResources.filter((r) => r.checked).length
  const currentIndex = lessons.findIndex((l) => l.id === lessonId)
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      {week && lesson && (
        <Breadcrumb
          items={[
            { label: 'dashboard', to: '/dashboard' },
            { label: `week ${week.position}`, to: `/weeks/${week.id}` },
            { label: lesson.title.toLowerCase() },
          ]}
        />
      )}

      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}

        {lesson && (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
                    [ week {week?.position} · lesson {lesson.position}
                    {lesson.estimated_minutes ? ` · ${lesson.estimated_minutes} min` : ''} ]
                  </p>
                  <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">{lesson.title}</h1>
                </div>
                {completedAt && <StatusPill variant="pass">complete</StatusPill>}
              </div>

              {lesson.body && (
                <div className="prose prose-sm mt-6 max-w-none text-ink">
                  <ReactMarkdown>{lesson.body}</ReactMarkdown>
                </div>
              )}

              {resources.length > 0 ? (
                <>
                  <div className="mt-9 flex items-center justify-between">
                    <p className="meta">Resources · check each one off</p>
                    <p className="font-mono text-xs font-bold text-muted">
                      {doneCount}/{requiredResources.length} done
                    </p>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {resources.map((resource) => (
                      <ResourceRow
                        key={resource.id}
                        resource={resource}
                        onToggle={(checked) => void toggleResource(resource.id, checked)}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <Card className="mt-8 text-center">
                  <p className="text-[14.5px] text-muted">This lesson has no external resources.</p>
                  {!completedAt && (
                    <Button type="button" variant="primary" onClick={() => void markCompleteManually()} className="mt-4">
                      Mark as complete
                    </Button>
                  )}
                </Card>
              )}

              {resources.length > 0 && (
                <div
                  className={`mt-8 flex flex-col gap-4 rounded-panel border-2 border-ink p-6 sm:flex-row sm:items-center sm:justify-between ${
                    completedAt ? 'bg-lime' : 'bg-stone'
                  }`}
                >
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink/60">
                      {completedAt ? 'Next up' : `${doneCount}/${requiredResources.length} required checked`}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-ink">
                      {completedAt
                        ? (nextLesson?.title ?? 'Nice work')
                        : 'Check off the required resources to continue'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!completedAt || !nextLesson}
                    onClick={() => nextLesson && navigate(`/weeks/${weekId}/lessons/${nextLesson.id}`)}
                    className="shrink-0 text-ink"
                  >
                    {nextLesson ? 'Continue →' : 'Complete'}
                  </Button>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              {week && (
                <Card>
                  <p className="meta">Week {week.position} contents</p>
                  <ul className="mt-3 divide-y divide-hairline">
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/weeks/${weekId}/lessons/${l.id}`}
                          className={`flex items-center gap-3 py-2.5 no-underline ${l.id === lessonId ? 'font-bold text-ink' : 'text-ink'}`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 font-mono text-[10px] font-bold ${
                              l.completed ? 'border-pass bg-pass-bg text-pass-ink' : 'border-ink text-ink'
                            }`}
                          >
                            {l.completed ? '✓' : l.position}
                          </span>
                          <span className="text-[14px]">{l.title}</span>
                        </Link>
                      </li>
                    ))}
                    {assignments.map((a) => (
                      <li key={a.id}>
                        <Link to={`/weeks/${weekId}/assignments/${a.id}`} className="flex items-center gap-3 py-2.5 text-ink no-underline">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink bg-lilac/40">
                            <AssignmentIcon className="h-3 w-3 text-ink" />
                          </span>
                          <span className="text-[14px]">{a.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Callout tone="info" heading="how unlocking works" icon={<LockIcon className="h-3.5 w-3.5" />}>
                Check off every required resource in every lesson, then pass the week's assignment. Week{' '}
                {(week?.position ?? 0) + 1} opens automatically.
              </Callout>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
