import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import type { Resource } from '@/types/database'

interface BrokenResource extends Resource {
  lessonTitle: string
  weekTitle: string
  weekPosition: number
}

function useBrokenResources() {
  const [resources, setResources] = useState<BrokenResource[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const { data: broken } = await supabase.from('resources').select('*').eq('is_broken', true)
    const lessonIds = [...new Set((broken ?? []).map((r) => r.lesson_id))]
    const { data: lessons } = lessonIds.length
      ? await supabase.from('lessons').select('id, title, week_id').in('id', lessonIds)
      : { data: [] }
    const weekIds = [...new Set((lessons ?? []).map((l) => l.week_id))]
    const { data: weeks } = weekIds.length
      ? await supabase.from('weeks').select('id, title, position').in('id', weekIds)
      : { data: [] }

    const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]))
    const weekById = new Map((weeks ?? []).map((w) => [w.id, w]))

    setResources(
      ((broken ?? []) as Resource[]).map((r) => {
        const lesson = lessonById.get(r.lesson_id)
        const week = lesson ? weekById.get(lesson.week_id) : undefined
        return {
          ...r,
          lessonTitle: lesson?.title ?? 'Unknown lesson',
          weekTitle: week?.title ?? '',
          weekPosition: week?.position ?? 0,
        }
      }),
    )
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  return { resources, loading, refresh }
}

export default function BrokenLinksPage() {
  const { resources, loading, refresh } = useBrokenResources()

  async function dismiss(resourceId: string) {
    await supabase.from('resources').update({ is_broken: false }).eq('id', resourceId)
    await refresh()
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Broken links</h1>
        <p className="mt-1 text-sm text-slate-500">
          Flagged by the periodic link checker. Students are never blocked by these (PD-009) — this is
          admin-only visibility.
        </p>

        <div className="mt-6 space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-400">
                    Week {r.weekPosition} — {r.lessonTitle}
                  </p>
                  <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-brand-600 hover:underline">
                    {r.url}
                  </a>
                  <p className="mt-1 text-xs text-red-600">
                    Last checked {r.last_checked_at ? new Date(r.last_checked_at).toLocaleString() : 'never'}
                    {r.last_status_code ? ` — HTTP ${r.last_status_code}` : ''}
                  </p>
                </div>
                <Link
                  to={`/admin/curriculum/lessons/${r.lesson_id}`}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
              <button
                onClick={() => void dismiss(r.id)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-700"
              >
                Mark as fixed
              </button>
            </div>
          ))}
          {resources.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No broken links right now.</p>
          )}
        </div>
      </main>
    </div>
  )
}
