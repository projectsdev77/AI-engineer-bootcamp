import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Field, Label } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Callout from '@/components/ui/Callout'
import StatusPill from '@/components/ui/StatusPill'
import { AlertIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { functionErrorMessage } from '@/lib/functionsError'
import { normalizeCalLink } from '@/lib/calLink'
import type { Profile } from '@/types/database'

interface MentorRow extends Profile {
  activeStudentCount: number
  pending: boolean
}

function useMentors() {
  const [mentors, setMentors] = useState<MentorRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    // Deliberately not setLoading(true) here: it's also called right after
    // a successful invite, and flipping loading back to true would
    // unmount the whole page back to a full-page spinner right then.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mentor')
      .order('created_at', { ascending: false })

    const mentorIds = (profiles ?? []).map((p) => p.id)
    const { data: assignments } = mentorIds.length
      ? await supabase.from('mentor_assignments').select('mentor_id').in('mentor_id', mentorIds).eq('is_active', true)
      : { data: [] }

    const countByMentor = new Map<string, number>()
    for (const a of assignments ?? []) {
      countByMentor.set(a.mentor_id, (countByMentor.get(a.mentor_id) ?? 0) + 1)
    }

    // profiles has no visibility into auth.users, so whether an invite has
    // actually been accepted (as opposed to just sent — admin-invite-mentor
    // creates the profile row immediately) has to come from a separate
    // admin-only call. Don't let this fail the whole page: an invite still
    // shows up, just without the pending badge, if it errors.
    const { data: statusData } = await supabase.functions.invoke('admin-mentor-status')
    const pendingIds = new Set<string>(statusData?.pending ?? [])

    setMentors(
      ((profiles ?? []) as Profile[]).map((p) => ({
        ...p,
        activeStudentCount: countByMentor.get(p.id) ?? 0,
        pending: pendingIds.has(p.id),
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { mentors, loading, refresh }
}

function RemoveMentorButton({ mentor, onRemoved }: { mentor: MentorRow; onRemoved: () => void }) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove() {
    const warning =
      mentor.activeStudentCount > 0
        ? `Remove ${mentor.full_name ?? 'this mentor'}? They have ${mentor.activeStudentCount} active student${mentor.activeStudentCount === 1 ? '' : 's'} — those students will be left unassigned and need a new mentor picked manually from their student page. This cannot be undone.`
        : `Remove ${mentor.full_name ?? 'this mentor'}? This cannot be undone.`
    if (!confirm(warning)) return

    setError(null)
    setRemoving(true)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-remove-mentor', {
      body: { mentorId: mentor.id },
    })
    setRemoving(false)
    if (invokeError) {
      setError(await functionErrorMessage(invokeError))
      return
    }
    if (data?.error) {
      setError(data.error as string)
      return
    }
    onRemoved()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="danger" onClick={() => void handleRemove()} disabled={removing}>
        {removing ? 'Removing…' : 'Remove'}
      </Button>
      {error && <p className="text-right text-[11.5px] font-bold text-fail-ink">{error}</p>}
    </div>
  )
}

function AddMentorForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-invite-mentor', {
      body: { email, fullName },
    })
    setSubmitting(false)
    if (invokeError) {
      setError(await functionErrorMessage(invokeError))
      return
    }
    if (data?.error) {
      setError(data.error as string)
      return
    }
    setSent(true)
    setFullName('')
    setEmail('')
    onAdded()
  }

  if (!open) {
    return (
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        + Add mentor
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4">
      <p className="meta">Invite a new mentor</p>
      <div>
        <Label htmlFor="mentor_full_name">Full name</Label>
        <Field id="mentor_full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mentor_email">Email</Label>
        <Field id="mentor_email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {error && (
        <Callout tone="fail" heading="couldn't send invite" icon={<AlertIcon className="h-3.5 w-3.5" />}>
          {error}
        </Callout>
      )}
      {sent && <Callout tone="pass">Invite sent — they'll set their own password from the email link.</Callout>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send invite'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * The mentor's Cal.com link — what makes them bookable on /dashboard/coaching.
 * Photo and title are the mentor's own (set in their Settings); the admin
 * only manages the booking link, per the client's spec.
 */
function CoachingEditor({ mentor, onSaved, onCancel }: { mentor: MentorRow; onSaved: () => void; onCancel: () => void }) {
  const [calLink, setCalLink] = useState(mentor.cal_link ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const cal = normalizeCalLink(calLink)
    if (cal.error) {
      setError(cal.error)
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.from('profiles').update({ cal_link: cal.value }).eq('id', mentor.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div>
        <Label htmlFor={`cal-${mentor.id}`}>Cal.com link</Label>
        <Field
          id={`cal-${mentor.id}`}
          value={calLink}
          onChange={(e) => setCalLink(e.target.value)}
          placeholder="https://cal.com/their-name"
        />
        <p className="mt-1.5 text-[13px] text-muted">
          Their profile link, not a single event's link, so students see both session types. Leave blank to hide them
          from the coaching page. Mentors set their own photo and title in Settings.
        </p>
      </div>
      {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function CoachingPill({ mentor }: { mentor: MentorRow }) {
  if (!mentor.cal_link) return <StatusPill variant="locked">no Cal.com link</StatusPill>
  if (mentor.pending) return <StatusPill variant="warn">after invite accepted</StatusPill>
  return <StatusPill variant="pass">bookable</StatusPill>
}

export default function MentorsListPage() {
  const { mentors, loading, refresh } = useMentors()
  const [editingId, setEditingId] = useState<string | null>(null)

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ {mentors.length} total ]</p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Mentors</h1>
          </div>
          <AddMentorForm onAdded={refresh} />
        </div>

        <div className="mt-6">
          <Table>
            <THead>
              <TR>
                <TH>Mentor</TH>
                <TH>Status</TH>
                <TH>Active students</TH>
                <TH>Coaching</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {mentors.map((m) => (
                <Fragment key={m.id}>
                  <TR>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} src={m.avatar_url} size={36} />
                        <div className="min-w-0">
                          <p className="font-bold text-ink">{m.full_name ?? 'Unnamed mentor'}</p>
                          {m.title && <p className="text-[12.5px] text-muted">{m.title}</p>}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {m.pending ? (
                        <StatusPill variant="warn">pending invite</StatusPill>
                      ) : (
                        <StatusPill variant="pass">active</StatusPill>
                      )}
                    </TD>
                    <TD className="text-[13.5px] text-muted">{m.activeStudentCount}</TD>
                    <TD>
                      <CoachingPill mentor={m} />
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-start justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                          className="font-mono text-[11.5px] font-bold uppercase tracking-[0.06em] text-blue-700 hover:underline"
                        >
                          {editingId === m.id ? 'Close' : 'Edit link'}
                        </button>
                        <RemoveMentorButton mentor={m} onRemoved={refresh} />
                      </div>
                    </TD>
                  </TR>
                  {editingId === m.id && (
                    <TR>
                      <TD colSpan={5}>
                        <CoachingEditor
                          mentor={m}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => {
                            setEditingId(null)
                            void refresh()
                          }}
                        />
                      </TD>
                    </TR>
                  )}
                </Fragment>
              ))}
            </TBody>
          </Table>
          {mentors.length === 0 && (
            <p className="py-8 text-center font-mono text-xs font-bold uppercase text-muted">No mentors yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
