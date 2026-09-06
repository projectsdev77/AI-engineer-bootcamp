import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Submission } from '@/types/database'

const FINAL_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  passed: { label: 'Passed', className: 'bg-green-100 text-green-700' },
  needs_work: { label: 'Needs work', className: 'bg-amber-100 text-amber-700' },
}

export default function SubmissionResult({
  submission,
  onFlag,
}: {
  submission: Submission
  onFlag: (reason: string) => void
}) {
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [reason, setReason] = useState('')

  const status = FINAL_STATUS_LABEL[submission.final_status]
  const canFlag =
    submission.final_status !== 'pending' &&
    !submission.flagged_for_review_at &&
    submission.evaluation_status === 'complete'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Attempt {submission.attempt_number}</span>
        {status && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>

      {(submission.evaluation_status === 'pending' || submission.evaluation_status === 'processing') && (
        <p className="mt-3 text-sm text-slate-500">Grading in progress — this usually takes a few seconds…</p>
      )}

      {submission.evaluation_status === 'failed' && (
        <p className="mt-3 text-sm text-amber-700">
          We couldn't generate automatic feedback for this attempt. A mentor will take a look soon —
          you don't need to do anything.
        </p>
      )}

      {submission.ai_feedback && (
        <div className="prose prose-slate prose-sm mt-3 max-w-none">
          <ReactMarkdown>{submission.ai_feedback}</ReactMarkdown>
        </div>
      )}

      {submission.human_feedback && (
        <div className="mt-4 rounded-md bg-brand-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Mentor feedback</p>
          <p className="mt-1 text-sm text-slate-700">{submission.human_feedback}</p>
        </div>
      )}

      {submission.flagged_for_review_at && !submission.reviewed_at && (
        <p className="mt-3 text-sm text-slate-500">
          You asked for a second look on {new Date(submission.flagged_for_review_at).toLocaleDateString()}
          . A mentor will follow up here.
        </p>
      )}

      {canFlag && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {showFlagForm ? (
            <div className="space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What would you like a mentor to take another look at?"
                rows={2}
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onFlag(reason)
                    setShowFlagForm(false)
                  }}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Request review
                </button>
                <button
                  onClick={() => setShowFlagForm(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFlagForm(true)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              This feedback is AI-generated. Ask a mentor for a second look →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
