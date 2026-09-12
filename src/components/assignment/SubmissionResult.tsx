import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Submission } from '@/types/database'
import StatusPill from '@/components/ui/StatusPill'
import Callout from '@/components/ui/Callout'
import { Button, LinkButton } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { MessageIcon } from '@/components/ui/icons'

export default function SubmissionResult({
  submission,
  onFlag,
  onRefresh,
  isLatest,
  continueHref,
}: {
  submission: Submission
  onFlag: (reason: string) => void
  onRefresh?: () => void
  isLatest?: boolean
  continueHref?: string
}) {
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [reason, setReason] = useState('')

  const canFlag =
    submission.final_status !== 'pending' &&
    !submission.flagged_for_review_at &&
    submission.evaluation_status === 'complete'

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="meta">Attempt {submission.attempt_number}</span>
        {submission.final_status === 'passed' && <StatusPill variant="pass">passed</StatusPill>}
        {submission.final_status === 'needs_work' && <StatusPill variant="warn">needs work</StatusPill>}
        {submission.final_status === 'pending' && <StatusPill variant="progress">evaluating</StatusPill>}
      </div>

      {submission.content && (
        <div className="mt-4 rounded-card border-2 border-hairline bg-paper p-4">
          <p className="meta mb-1.5 text-faint">Submission</p>
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{submission.content}</p>
        </div>
      )}

      {(submission.evaluation_status === 'pending' || submission.evaluation_status === 'processing') && (
        <Callout tone="info" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Evaluating — usually under a minute.</span>
            {isLatest && onRefresh && (
              <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
                Check again
              </Button>
            )}
          </div>
        </Callout>
      )}

      {submission.evaluation_status === 'failed' && (
        <Callout tone="warn" className="mt-4">
          We couldn't generate automatic feedback for this attempt. A mentor will take a look soon — you don't need to
          do anything.
        </Callout>
      )}

      {submission.ai_feedback && (
        <Callout tone="info" heading="AI feedback" icon={<MessageIcon className="h-3.5 w-3.5" />} className="mt-4">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{submission.ai_feedback}</ReactMarkdown>
          </div>
        </Callout>
      )}

      {submission.human_feedback && (
        <div className="mt-4 rounded-card border-2 border-ink bg-surface p-4">
          <p className="meta mb-1.5">Mentor feedback</p>
          <p className="text-[14.5px] leading-relaxed text-ink">{submission.human_feedback}</p>
        </div>
      )}

      {submission.flagged_for_review_at && !submission.reviewed_at && (
        <p className="mt-4 text-[13.5px] text-muted">
          You asked for a second look on {new Date(submission.flagged_for_review_at).toLocaleDateString()}. A mentor
          will follow up here.
        </p>
      )}

      {submission.final_status === 'passed' && isLatest && (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-card border-2 border-pass bg-pass-bg px-4 py-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-pass-ink">
            ✓ Nice work — the next week is ready.
          </p>
          {continueHref && (
            <LinkButton to={continueHref} variant="primary" size="sm" className="shrink-0">
              Continue
            </LinkButton>
          )}
        </div>
      )}
      {submission.final_status === 'needs_work' && isLatest && (
        <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-wide text-warn-ink">
          Give it another attempt when you're ready — retries don't cost you anything.
        </p>
      )}

      {canFlag && (
        <div className="mt-5 border-t-2 border-hairline pt-4">
          {showFlagForm ? (
            <div className="space-y-2">
              <TextAreaField
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What would you like a mentor to take another look at?"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onFlag(reason)
                    setShowFlagForm(false)
                  }}
                >
                  Request review
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowFlagForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowFlagForm(true)} className="font-bold text-blue-700 underline decoration-2 underline-offset-2">
              This feedback is AI-generated. Ask a mentor for a second look →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
