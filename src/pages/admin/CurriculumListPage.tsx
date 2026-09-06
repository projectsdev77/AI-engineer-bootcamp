import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import StatusToggle from '@/components/admin/StatusToggle'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useTrack } from '@/hooks/useTrack'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Week } from '@/types/database'

function useBrokenLinkCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    void supabase
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('is_broken', true)
      .then(({ count }) => setCount(count ?? 0))
  }, [])
  return count
}

export default function CurriculumListPage() {
  const { track, loading: trackLoading, error: trackError, createDefaultTrack } = useTrack()
  const {
    items: weeks,
    loading: weeksLoading,
    error: weeksError,
    create,
    update,
    remove,
    moveUp,
    moveDown,
  } = useAdminCollection<Week>('weeks', 'track_id', track?.id)
  const brokenLinks = useBrokenLinkCount()

  const [newTitle, setNewTitle] = useState('')

  if (trackLoading) return <FullPageSpinner />

  const publishedCount = weeks.filter((w) => w.status === 'published').length
  const draftCount = weeks.length - publishedCount

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        {trackError && <p className="text-sm font-bold text-fail-ink">{trackError}</p>}

        {!track && !trackError && (
          <div className="rounded-panel border-2 border-dashed border-disabled p-8 text-center">
            <p className="text-[14.5px] text-muted">No track exists yet.</p>
            <Button type="button" variant="primary" onClick={() => void createDefaultTrack()} className="mt-4">
              Create the track
            </Button>
          </div>
        )}

        {track && (
          <>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
              [ {weeks.length} weeks · {publishedCount} published · {draftCount} draft ]
            </p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Curriculum</h1>
            {weeksError && <p className="mt-4 text-sm font-bold text-fail-ink">{weeksError}</p>}

            {weeksLoading ? (
              <p className="mt-6 font-mono text-xs font-bold uppercase text-muted">loading weeks…</p>
            ) : (
              <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
                <div>
                  <Table>
                    <THead>
                      <TR>
                        <TH>#</TH>
                        <TH>Week</TH>
                        <TH>State</TH>
                        <TH>Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {weeks.map((week, i) => (
                        <TR key={week.id}>
                          <TD className="font-mono font-bold text-faint">{String(week.position).padStart(2, '0')}</TD>
                          <TD>
                            <Link to={`/admin/curriculum/weeks/${week.id}`} className="font-bold text-ink no-underline hover:text-blue-700">
                              {week.title}
                            </Link>
                            {week.goal && <p className="mt-0.5 truncate text-[13px] text-muted">{week.goal}</p>}
                          </TD>
                          <TD>
                            <StatusToggle status={week.status} onChange={(next) => void update(week.id, { status: next })} />
                          </TD>
                          <TD>
                            <div className="flex items-center gap-3">
                              <ReorderButtons
                                canMoveUp={i > 0}
                                canMoveDown={i < weeks.length - 1}
                                onMoveUp={() => void moveUp(week.id)}
                                onMoveDown={() => void moveDown(week.id)}
                              />
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${week.title}" and everything in it?`)) void remove(week.id)
                                }}
                                className="font-mono text-[11.5px] font-bold uppercase text-fail-ink hover:underline"
                              >
                                del
                              </button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!newTitle.trim()) return
                      void create({ title: newTitle.trim(), status: 'draft' })
                      setNewTitle('')
                    }}
                    className="mt-4 flex gap-2 rounded-panel border-2 border-dashed border-disabled p-4"
                  >
                    <Field value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New week title…" className="flex-1" />
                    <Button type="submit" variant="primary">
                      Add week
                    </Button>
                  </form>
                </div>

                <aside className="space-y-6">
                  <div className="card">
                    <p className="meta">Track health</p>
                    <dl className="mt-3 space-y-2 text-[13.5px]">
                      <div className="flex justify-between">
                        <dt className="text-muted">Published</dt>
                        <dd className="font-mono font-bold text-ink">{publishedCount}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Draft</dt>
                        <dd className="font-mono font-bold text-ink">{draftCount}</dd>
                      </div>
                    </dl>
                  </div>

                  {brokenLinks !== null && brokenLinks > 0 && (
                    <Callout tone="warn" heading={`${brokenLinks} broken link${brokenLinks === 1 ? '' : 's'}`} icon={<AlertIcon className="h-3.5 w-3.5" />}>
                      Students are never blocked by these.{' '}
                      <Link to="/admin/broken-links" className="font-bold text-warn-ink underline decoration-2 underline-offset-2">
                        review links →
                      </Link>
                    </Callout>
                  )}
                </aside>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
