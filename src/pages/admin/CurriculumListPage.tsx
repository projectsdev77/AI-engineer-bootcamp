import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import StatusToggle from '@/components/admin/StatusToggle'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useTrack } from '@/hooks/useTrack'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Week } from '@/types/database'

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

  const [newTitle, setNewTitle] = useState('')

  if (trackLoading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Curriculum</h1>

        {trackError && <p className="mt-4 text-sm text-red-600">{trackError}</p>}

        {!track && !trackError && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-600">No track exists yet.</p>
            <button
              onClick={() => void createDefaultTrack()}
              className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Create the track
            </button>
          </div>
        )}

        {track && (
          <>
            <p className="mt-1 text-sm text-slate-500">{track.title}</p>
            {weeksError && <p className="mt-4 text-sm text-red-600">{weeksError}</p>}

            {weeksLoading ? (
              <p className="mt-6 text-sm text-slate-400">Loading weeks…</p>
            ) : (
              <div className="mt-6 space-y-3">
                {weeks.map((week, i) => (
                  <div
                    key={week.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <ReorderButtons
                      canMoveUp={i > 0}
                      canMoveDown={i < weeks.length - 1}
                      onMoveUp={() => void moveUp(week.id)}
                      onMoveDown={() => void moveDown(week.id)}
                    />
                    <Link to={`/admin/curriculum/weeks/${week.id}`} className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        Week {week.position}: {week.title}
                      </p>
                      {week.goal && <p className="truncate text-sm text-slate-500">{week.goal}</p>}
                    </Link>
                    <StatusToggle
                      status={week.status}
                      onChange={(next) => void update(week.id, { status: next })}
                    />
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${week.title}" and everything in it?`)) void remove(week.id)
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newTitle.trim()) return
                    void create({ title: newTitle.trim(), status: 'draft' })
                    setNewTitle('')
                  }}
                  className="flex gap-2 rounded-lg border border-dashed border-slate-300 p-4"
                >
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New week title…"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Add week
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
