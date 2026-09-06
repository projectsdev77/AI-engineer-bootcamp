import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useLessonDetail, type ResourceWithProgress } from '@/hooks/useLessonDetail'

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
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        checked={resource.checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        aria-label={`Mark "${resource.title}" as ${resource.checked ? 'incomplete' : 'complete'}`}
      />
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className={`font-medium hover:underline ${resource.checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}
        >
          {resource.title}
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
            {RESOURCE_TYPE_LABEL[resource.resource_type] ?? resource.resource_type}
          </span>
          {resource.source_name && <span>{resource.source_name}</span>}
          {resource.estimated_minutes && <span>{resource.estimated_minutes} min</span>}
          {!resource.is_required && <span className="italic">Optional</span>}
        </div>
      </div>
    </li>
  )
}

export default function LessonPage() {
  const { lessonId, weekId } = useParams()
  const { lesson, resources, completedAt, loading, error, toggleResource, markCompleteManually } =
    useLessonDetail(lessonId)

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to={`/weeks/${weekId}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to week
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {lesson && (
          <>
            <div className="mt-2 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
              {completedAt && (
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  Complete
                </span>
              )}
            </div>

            {lesson.body && (
              <div className="prose prose-slate prose-sm mt-6 max-w-none">
                <ReactMarkdown>{lesson.body}</ReactMarkdown>
              </div>
            )}

            {resources.length > 0 ? (
              <ul className="mt-8 space-y-3">
                {resources.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    onToggle={(checked) => void toggleResource(resource.id, checked)}
                  />
                ))}
              </ul>
            ) : (
              <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-600">This lesson has no external resources.</p>
                {!completedAt && (
                  <button
                    onClick={() => void markCompleteManually()}
                    className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Mark as complete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
