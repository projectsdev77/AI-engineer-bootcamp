import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useTicketThread } from '@/hooks/useTicketThread'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Avatar from '@/components/ui/Avatar'
import Callout from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/Field'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import TicketThread from '@/components/messages/TicketThread'
import Composer from '@/components/messages/Composer'
import { TicketStatusPill } from '@/components/messages/TicketList'
import type { TicketSummary } from '@/types/database'

function ThreadNotice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-stone px-4 py-3.5">
      <p className="text-[14px] text-ink">{children}</p>
      {action}
    </div>
  )
}

function ReassignControl({ ticket, onReassign }: { ticket: TicketSummary; onReassign: (id: string | null) => Promise<boolean> }) {
  const [mentors, setMentors] = useState<{ id: string; full_name: string | null }[]>([])
  const [value, setValue] = useState(ticket.claimed_by ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void supabase.rpc('list_active_mentors').then(({ data }) => setMentors((data ?? []) as typeof mentors))
  }, [])
  useEffect(() => setValue(ticket.claimed_by ?? ''), [ticket.claimed_by])

  return (
    <div className="w-full sm:w-auto">
      <label htmlFor="reassign" className="mb-1 block font-mono text-[10.5px] font-bold uppercase tracking-wide text-muted">
        Assigned to
      </label>
      <div className="flex gap-2">
        <SelectField
          id="reassign"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 py-1.5 text-[13.5px] sm:w-56 sm:flex-none"
        >
          <option value="">Unclaimed (back to queue)</option>
          {ticket.claimed_by && !mentors.some((m) => m.id === ticket.claimed_by) && (
            <option value={ticket.claimed_by}>{ticket.claimed_by_name ?? 'Current'}</option>
          )}
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? 'Unnamed mentor'}
            </option>
          ))}
        </SelectField>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving || value === (ticket.claimed_by ?? '')}
          onClick={async () => {
            setSaving(true)
            await onReassign(value || null)
            setSaving(false)
          }}
        >
          {saving ? 'Saving…' : 'Reassign'}
        </Button>
      </div>
    </div>
  )
}

/** One question thread, at /questions/:ticketId for every role. */
export default function TicketPage() {
  const { ticketId } = useParams()
  const { user, profile } = useAuth()
  const { ticket, messages, attachmentUrls, loading, error, clearError, send, claim, close, reassign } =
    useTicketThread(ticketId)
  const [busy, setBusy] = useState<'claim' | 'close' | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const isStudent = profile?.role === 'student'
  const isAdmin = profile?.role === 'admin'
  const listPath = '/questions'

  if (loading) return <FullPageSpinner />

  if (!ticket) {
    return (
      <div className="min-h-screen bg-paper">
        <AppNav />
        <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
          <Callout tone="warn" heading="Question not available">
            {error ??
              "It doesn't exist, or it's no longer visible to you. For example, another mentor may have claimed it."}{' '}
            <Link to={listPath}>Back to {isStudent ? 'your questions' : 'the queue'}</Link>
          </Callout>
        </main>
      </div>
    )
  }

  const isOpen = ticket.status === 'open'
  const mineToHandle = ticket.claimed_by === user?.id
  const canReply = isOpen && (ticket.student_id === user?.id || mineToHandle)

  async function act(kind: 'claim' | 'close') {
    setBusy(kind)
    clearError()
    if (kind === 'claim') await claim()
    else await close()
    setBusy(null)
    setConfirmClose(false)
  }

  let footer: ReactNode
  if (!isOpen) {
    footer = (
      <ThreadNotice>
        This question was closed
        {ticket.closed_at ? ` on ${new Date(ticket.closed_at).toLocaleDateString()}` : ''}. You can still read it, but
        no new messages can be added.
      </ThreadNotice>
    )
  } else if (canReply) {
    footer = <Composer onSend={send} />
  } else if (!ticket.claimed_by) {
    footer = (
      <ThreadNotice
        action={
          <Button type="button" variant="primary" size="sm" disabled={busy !== null} onClick={() => void act('claim')}>
            {busy === 'claim' ? 'Claiming…' : 'Claim question'}
          </Button>
        }
      >
        Claim this question to reply. It moves out of the shared queue and the student sees your name.
      </ThreadNotice>
    )
  } else {
    footer = <ThreadNotice>{ticket.claimed_by_name ?? 'Another mentor'} is handling this question.</ThreadNotice>
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <Breadcrumb
        items={[
          { label: 'questions', to: listPath },
          { label: ticket.subject.length > 40 ? ticket.subject.slice(0, 40) + '…' : ticket.subject },
        ]}
      />
      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">{ticket.context_label}</p>
            <h1 className="mt-1.5 break-words font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {ticket.subject}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <TicketStatusPill ticket={ticket} />
              {!isStudent && (
                <span className="text-[13.5px] text-muted">
                  Asked by <span className="font-semibold text-ink">{ticket.student_name ?? 'a student'}</span>
                  {ticket.is_my_student && ' (your student)'}
                </span>
              )}
            </div>
          </div>

          {isOpen && mineToHandle && (
            <div className="flex items-center gap-2">
              {confirmClose ? (
                <>
                  <span className="text-[13.5px] text-muted">Close for good?</span>
                  <Button type="button" variant="primary" size="sm" disabled={busy !== null} onClick={() => void act('close')}>
                    {busy === 'close' ? 'Closing…' : 'Yes, resolve'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmClose(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmClose(true)}>
                  Close / resolve
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Who's handling it — what the student cares about most. */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border-2 border-ink bg-surface px-4 py-3">
          {ticket.claimed_by ? (
            <div className="flex items-center gap-3">
              <Avatar name={ticket.claimed_by_name} src={ticket.claimed_by_avatar_url} size={36} />
              <div>
                <p className="text-[14px] text-ink">
                  {isOpen ? (
                    <>
                      <span className="font-semibold">{mineToHandle ? 'You' : (ticket.claimed_by_name ?? 'A mentor')}</span>{' '}
                      {mineToHandle ? 'are handling this' : 'is handling this'}
                    </>
                  ) : (
                    <>
                      Handled by <span className="font-semibold">{mineToHandle ? 'you' : (ticket.claimed_by_name ?? 'a mentor')}</span>
                    </>
                  )}
                </p>
                {!mineToHandle && ticket.claimed_by_title && <p className="text-[12.5px] text-muted">{ticket.claimed_by_title}</p>}
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-muted">
              {isStudent ? 'Waiting for a mentor to pick this up.' : 'Unclaimed and waiting in the shared mentor queue.'}
            </p>
          )}
          {isAdmin && isOpen && <ReassignControl ticket={ticket} onReassign={reassign} />}
        </div>

        {error && <p className="mt-4 text-sm font-bold text-fail-ink">{error}</p>}

        <div className="mt-5">
          <TicketThread ticket={ticket} messages={messages} attachmentUrls={attachmentUrls} footer={footer} />
        </div>
      </main>
    </div>
  )
}
