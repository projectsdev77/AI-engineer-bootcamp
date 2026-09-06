import { useState } from 'react'
import type { QueueItem } from '@/hooks/useExceptionQueue'
import StatusPill from '@/components/ui/StatusPill'
import Callout from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { CheckIcon, AlertIcon, MessageIcon } from '@/components/ui/icons'
import type { Profile } from '@/types/database'

export default function QueueCard({
  item,
  onResolve,
  mentorAssign,
}: {
  item: QueueItem
  onResolve?: (status: 'passed' | 'needs_work', feedback: string) => Promise<boolean>
  /** Admin-only: lets the reviewer reassign this student's mentor right from the card. */
  mentorAssign?: { mentors: Profile[]; currentMentorId: string | null; onReassign: (mentorId: string) => void }
}) {
  const [status, setStatus] = useState<'passed' | 'needs_work'>('needs_work')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const isFailed = item.evaluation_status === 'failed'
  const cause = isFailed ? 'AI evaluation failed' : 'Student requested review'
  const railColor = isFailed ? 'var(--color-fail)' : 'var(--color-warn)'

  async function handleResolve() {
    if (!onResolve || !feedback.trim()) return
    setSaving(true)
    const ok = await onResolve(status, feedback.trim())
    setSaving(false)
    if (ok) setFeedback('')
  }

  return (
    <div className="overflow-hidden rounded-panel border-2 border-ink bg-surface" style={{ borderLeftWidth: 8, borderLeftColor: railColor }}>
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-blue-50 font-display text-base font-bold text-ink">
              {item.studentName.charAt(0)}
            </span>
            <div>
              <p className="font-display text-lg font-bold text-ink">{item.studentName}</p>
              <p className="text-[13.5px] text-muted">
                Week {item.weekPosition} · {item.assignmentTitle} · attempt {item.attempt_number}
              </p>
            </div>
          </div>
          <div className="text-right">
            <StatusPill variant={isFailed ? 'fail' : 'warn'}>{cause}</StatusPill>
            <p className="mt-1.5 font-mono text-[11px] text-faint">
              {new Date(item.submitted_at).toLocaleDateString()}
            </p>
            {mentorAssign && (
              <select
                value={mentorAssign.currentMentorId ?? ''}
                onChange={(e) => mentorAssign.onReassign(e.target.value)}
                className="mt-2 rounded-full border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink"
              >
                <option value="" disabled>
                  assign mentor…
                </option>
                {mentorAssign.mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? m.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.content && (
            <div className="rounded-card border-2 border-hairline bg-paper p-4">
              <p className="meta mb-1.5 text-faint">Submission</p>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{item.content}</p>
            </div>
          )}
          {item.flag_reason && (
            <Callout tone="warn" heading="why the student flagged this" icon={<AlertIcon className="h-3.5 w-3.5" />}>
              {item.flag_reason}
            </Callout>
          )}
          {item.ai_error && !item.flag_reason && (
            <Callout tone="fail" heading="error" icon={<AlertIcon className="h-3.5 w-3.5" />}>
              <span className="font-mono text-[13px]">{item.ai_error}</span>
            </Callout>
          )}
        </div>

        {item.ai_feedback && (
          <Callout tone="info" heading="AI feedback" icon={<MessageIcon className="h-3.5 w-3.5" />} className="mt-3">
            {item.ai_feedback}
          </Callout>
        )}

        {item.reviewed_at ? (
          <div className="mt-5 border-t-2 border-hairline pt-4">
            <p className="meta">
              Resolved: {item.final_status === 'passed' ? 'passed' : 'needs work'}
            </p>
            {item.human_feedback && <p className="mt-1.5 text-[14.5px] text-ink">{item.human_feedback}</p>}
          </div>
        ) : (
          onResolve && (
            <div className="mt-5 space-y-3 border-t-2 border-hairline pt-4">
              <div className="flex items-center gap-3">
                <span className="meta">Verdict</span>
                <Button
                  type="button"
                  size="sm"
                  variant={status === 'passed' ? 'primary' : 'secondary'}
                  onClick={() => setStatus('passed')}
                >
                  <CheckIcon className="h-3.5 w-3.5" /> Pass
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={status === 'needs_work' ? 'primary' : 'secondary'}
                  onClick={() => setStatus('needs_work')}
                  className={status === 'needs_work' ? '!bg-warn !border-warn' : ''}
                >
                  <AlertIcon className="h-3.5 w-3.5" /> Needs work
                </Button>
              </div>
              <TextAreaField
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback for the student…"
                rows={2}
              />
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-faint">
                  student is notified immediately on resolve
                </p>
                <Button type="button" variant="primary" onClick={() => void handleResolve()} disabled={saving || !feedback.trim()}>
                  {saving ? 'Saving…' : 'Resolve'}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
