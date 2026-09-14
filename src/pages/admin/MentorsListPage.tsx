import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Field, Label } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import Callout from '@/components/ui/Callout'
import StatusPill from '@/components/ui/StatusPill'
import { AlertIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { functionErrorMessage } from '@/lib/functionsError'
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

export default function MentorsListPage() {
  const { mentors, loading, refresh } = useMentors()

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
              </TR>
            </THead>
            <TBody>
              {mentors.map((m) => (
                <TR key={m.id}>
                  <TD className="font-bold text-ink">{m.full_name ?? 'Unnamed mentor'}</TD>
                  <TD>
                    {m.pending ? (
                      <StatusPill variant="warn">pending invite</StatusPill>
                    ) : (
                      <StatusPill variant="pass">active</StatusPill>
                    )}
                  </TD>
                  <TD className="text-[13.5px] text-muted">{m.activeStudentCount}</TD>
                </TR>
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
