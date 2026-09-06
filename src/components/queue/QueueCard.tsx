import { useState } from 'react'
import type { QueueItem } from '@/hooks/useExceptionQueue'

export default function QueueCard({
  item,
  onResolve,
}: {
  item: QueueItem
  onResolve?: (status: 'passed' | 'needs_work', feedback: string) => Promise<boolean>
}) {
  const [status, setStatus] = useState<'passed' | 'needs_work'>('needs_work')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const cause = item.evaluation_status === 'failed' ? 'AI evaluation failed' : 'Student requested review'
  const causeClass =
    item.evaluation_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'

  async function handleResolve() {
    if (!onResolve || !feedback.trim()) return
    setSaving(true)
    const ok = await onResolve(status, feedback.trim())
    setSaving(false)
    if (ok) setFeedback('')
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{item.studentName}</p>
          <p className="text-sm text-slate-500">
            Week {item.weekPosition}: {item.weekTitle} — {item.assignmentTitle}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${causeClass}`}>{cause}</span>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Submitted {new Date(item.submitted_at).toLocaleString()} · attempt {item.attempt_number}
      </p>

      {item.content && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Submission</p>
          <p className="whitespace-pre-wrap">{item.content}</p>
        </div>
      )}

      {item.flag_reason && (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-600">
            Why the student flagged this
          </p>
          {item.flag_reason}
        </div>
      )}

      {item.ai_feedback && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">AI feedback</p>
          {item.ai_feedback}
        </div>
      )}

      {item.ai_error && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-500">Error</p>
          {item.ai_error}
        </div>
      )}

      {item.reviewed_at ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Resolved: {item.final_status === 'passed' ? 'Passed' : 'Needs work'}
          </p>
          {item.human_feedback && <p className="mt-1 text-sm text-slate-700">{item.human_feedback}</p>}
        </div>
      ) : (
        onResolve && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('passed')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${status === 'passed' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Pass
              </button>
              <button
                onClick={() => setStatus('needs_work')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${status === 'needs_work' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Needs work
              </button>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Feedback for the student…"
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={() => void handleResolve()}
              disabled={saving || !feedback.trim()}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Resolve'}
            </button>
          </div>
        )
      )}
    </div>
  )
}
