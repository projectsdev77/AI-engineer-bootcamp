import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Callout from '@/components/ui/Callout'
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
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ {resources.length} flagged ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Broken links</h1>
        <p className="mt-2 text-[14.5px] text-muted">
          Flagged by the periodic link checker. Students are never blocked by these (PD-009) — this is admin-only
          visibility.
        </p>

        <div className="mt-6">
          {resources.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>URL</TH>
                  <TH>HTTP</TH>
                  <TH>Where it lives</TH>
                  <TH>Last checked</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {resources.map((r) => (
                  <TR key={r.id} style={{ background: 'var(--color-warn-bg)' }}>
                    <TD>
                      <p className="font-bold text-ink">{r.title}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-[12px] text-blue-700">
                        {r.url}
                      </a>
                    </TD>
                    <TD className="font-mono font-bold text-warn-ink">{r.last_status_code ?? '—'}</TD>
                    <TD className="text-[13.5px] text-muted">
                      Week {r.weekPosition} · {r.lessonTitle}
                    </TD>
                    <TD className="font-mono text-[12px] text-faint">
                      {r.last_checked_at ? new Date(r.last_checked_at).toLocaleDateString() : 'never'}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/admin/curriculum/lessons/${r.lesson_id}`} className="font-mono text-[11.5px] font-bold uppercase text-blue-700 no-underline hover:underline">
                          edit
                        </Link>
                        <button onClick={() => void dismiss(r.id)} className="font-mono text-[11.5px] font-bold uppercase text-muted hover:text-ink">
                          mark fixed
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <Callout tone="pass" heading="all clear">
              No broken links right now.
            </Callout>
          )}
        </div>
      </main>
    </div>
  )
}
