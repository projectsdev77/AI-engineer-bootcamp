import { useState } from 'react'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useExceptionQueue } from '@/hooks/useExceptionQueue'
import QueueCard from '@/components/queue/QueueCard'

export default function ExceptionQueuePage() {
  const { open, resolved, loading, error, resolve } = useExceptionQueue()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')

  if (loading) return <FullPageSpinner />

  const list = tab === 'open' ? open : resolved

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Exception queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submissions where AI evaluation failed, or a student asked for a second look.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('open')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'open' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`}
          >
            Needs attention ({open.length})
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'resolved' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`}
          >
            Resolved ({resolved.length})
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {list.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              onResolve={tab === 'open' ? (status, feedback) => resolve(item.id, status, feedback) : undefined}
            />
          ))}
          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {tab === 'open' ? 'Nothing needs attention right now.' : 'No resolved items yet.'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
