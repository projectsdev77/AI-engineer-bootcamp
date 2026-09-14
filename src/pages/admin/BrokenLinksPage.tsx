import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Callout from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
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
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<{ checked: number; brokenCount: number } | null>(null)

  async function dismiss(resourceId: string) {
    await supabase.from('resources').update({ is_broken: false }).eq('id', resourceId)
    await refresh()
  }

  async function alwaysAllow(resourceId: string) {
    await supabase.from('resources').update({ is_broken: false, skip_health_check: true }).eq('id', resourceId)
    await refresh()
  }

  async function runCheck() {
    setChecking(true)
    setCheckError(null)
    const { data, error } = await supabase.functions.invoke('check-resource-links')
    setChecking(false)
    if (error) {
      setCheckError(error.message)
      return
    }
    setLastCheck({ checked: data.checked, brokenCount: data.brokenCount })
    await refresh()
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ {resources.length} flagged ]</p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Broken links</h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button type="button" variant="secondary" onClick={() => void runCheck()} disabled={checking}>
              {checking ? 'Checking…' : 'Check links now'}
            </Button>
            {lastCheck && !checking && (
              <p className="font-mono text-[11px] text-muted">
                checked {lastCheck.checked} · {lastCheck.brokenCount} broken
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-[14.5px] text-muted">
          Flagged by the link checker (HTTP failures only — a link that resolves but points to the wrong page won't
          be caught, and a few sites block automated checks entirely even when they work fine for a real visitor).
          Students are never blocked by these (PD-009) — this is admin-only visibility.{' '}
          <span className="font-bold text-ink">Mark fixed</span> clears it until the next check; if a link keeps
          coming back broken even though it works when you open it,{' '}
          <span className="font-bold text-ink">always allow</span> excludes it from future checks for good.
        </p>
        {checkError && (
          <Callout tone="fail" className="mt-3">
            {checkError}
          </Callout>
        )}

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
                        <button
                          onClick={() => void alwaysAllow(r.id)}
                          title="I've checked this link myself and it works — stop flagging it, even if automated checks keep failing it"
                          className="font-mono text-[11.5px] font-bold uppercase text-muted hover:text-ink"
                        >
                          always allow
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
