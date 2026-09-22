import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Field, Label, SelectField } from '@/components/ui/Field'
import StatusPill from '@/components/ui/StatusPill'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useProgressOverview } from '@/hooks/useProgressOverview'
import type { Profile } from '@/types/database'

function useMentorOptions() {
  const [mentors, setMentors] = useState<Profile[]>([])
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'mentor')
      setMentors((data ?? []) as Profile[])
    })()
  }, [])
  return mentors
}

function useAccountStatus(studentId: string | undefined) {
  const [status, setStatus] = useState<'active' | 'suspended' | null>(null)

  async function refresh() {
    if (!studentId) return
    const { data } = await supabase.from('profiles').select('status').eq('id', studentId).single()
    setStatus((data?.status as 'active' | 'suspended' | undefined) ?? null)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return { status, refresh }
}

function useCurrentMentor(studentId: string | undefined) {
  const [mentorId, setMentorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!studentId) return
    setLoading(true)
    const { data } = await supabase
      .from('mentor_assignments')
      .select('mentor_id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle()
    setMentorId(data?.mentor_id ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return { mentorId, loading, refresh }
}

export default function StudentAdminDetailPage() {
  const { studentId } = useParams()
  const { user } = useAuth()
  const { data, loading: progressLoading, error, refresh: refreshProgress } = useProgressOverview(studentId)
  const mentors = useMentorOptions()
  const { mentorId, refresh: refreshMentor } = useCurrentMentor(studentId)
  const [reassigning, setReassigning] = useState(false)
  const { status: accountStatus, refresh: refreshAccountStatus } = useAccountStatus(studentId)
  const [settingStatus, setSettingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [unlockWeekId, setUnlockWeekId] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const [paymentNote, setPaymentNote] = useState('')
  const [settingPayment, setSettingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  async function setPaymentStatus(status: 'paid' | 'unpaid') {
    if (!studentId) return
    setSettingPayment(true)
    setPaymentError(null)
    const { error } = await supabase.rpc('admin_set_payment_status', {
      p_student_id: studentId,
      p_status: status,
      p_note: paymentNote.trim() || null,
    })
    setSettingPayment(false)
    if (error) {
      setPaymentError(error.message)
      return
    }
    setPaymentNote('')
    await refreshProgress()
  }

  async function setAccountStatus(next: 'active' | 'suspended') {
    if (!studentId) return
    setSettingStatus(true)
    setStatusError(null)
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', studentId)
    setSettingStatus(false)
    if (error) {
      setStatusError(error.message)
      return
    }
    await refreshAccountStatus()
  }

  async function reassignMentor(newMentorId: string) {
    if (!studentId) return
    setReassigning(true)
    const { error } = await supabase.rpc('admin_reassign_mentor', {
      p_student_id: studentId,
      p_mentor_id: newMentorId,
    })
    setReassigning(false)
    if (!error) await refreshMentor()
  }

  async function manualUnlock() {
    if (!studentId || !user || !unlockWeekId || !unlockReason.trim()) return
    setUnlocking(true)
    setUnlockError(null)
    const { error } = await supabase.from('week_unlocks').insert({
      user_id: studentId,
      week_id: unlockWeekId,
      unlocked_by: 'admin',
      unlocked_by_user_id: user.id,
      reason: unlockReason.trim(),
    })
    setUnlocking(false)
    if (error) {
      // 23505 = unique_violation on week_unlocks(user_id, week_id) — the
      // week list below is only as fresh as the last refreshProgress(),
      // so this can still happen (two rapid clicks, a second admin tab,
      // the system's own auto-unlock landing in between). Either way the
      // week ends up unlocked, so treat it like success once refreshed.
      if (error.code === '23505') {
        setUnlockError(null)
        setUnlockWeekId('')
        setUnlockReason('')
      } else {
        setUnlockError(error.message)
      }
      await refreshProgress()
      return
    }
    setUnlockWeekId('')
    setUnlockReason('')
    await refreshProgress()
  }

  if (progressLoading) return <FullPageSpinner />

  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0
  const lockedWeeks = (data?.weeks ?? []).filter((w) => !w.unlocked)

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <Breadcrumb items={[{ label: 'students', to: '/admin/students' }, { label: 'student' }]} />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {overall && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="meta">Overall progress</span>
                <span className="font-display text-2xl font-bold text-ink">{overallPercent}%</span>
              </div>
              <div className="mt-3">
                <ProgressBar percent={overallPercent} tone="ink" />
              </div>
            </Card>
          )}

          <Card>
            <Label htmlFor="mentor">Assigned mentor</Label>
            <SelectField id="mentor" value={mentorId ?? ''} disabled={reassigning} onChange={(e) => void reassignMentor(e.target.value)}>
              <option value="" disabled>
                Select a mentor…
              </option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.id}
                </option>
              ))}
            </SelectField>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="meta">Account</span>
              {accountStatus === 'suspended' ? (
                <StatusPill variant="fail">suspended</StatusPill>
              ) : (
                <StatusPill variant="pass">active</StatusPill>
              )}
            </div>
            <p className="mt-2 text-[13.5px] text-muted">
              A suspended student is signed out immediately and can't log back in until reactivated.
            </p>
            <div className="mt-4">
              {statusError && <p className="mb-3 text-sm font-bold text-fail-ink">{statusError}</p>}
              {accountStatus === 'suspended' ? (
                <Button type="button" variant="primary" onClick={() => void setAccountStatus('active')} disabled={settingStatus}>
                  {settingStatus ? 'Saving…' : 'Reactivate account'}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => void setAccountStatus('suspended')} disabled={settingStatus} className="border-fail text-fail-ink">
                  {settingStatus ? 'Saving…' : 'Suspend account'}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="meta">Payment</span>
              {data?.payment_status === 'paid' ? (
                <StatusPill variant="pass">paid</StatusPill>
              ) : (
                <StatusPill variant="locked">unpaid</StatusPill>
              )}
            </div>
            <p className="mt-2 text-[13.5px] text-muted">
              Week 1 is free for everyone; the rest of the program requires payment. Stripe isn't wired up yet —
              mark paid manually once payment is confirmed some other way.
            </p>
            <div className="mt-4 space-y-3">
              <Field
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Note (e.g. paid via bank transfer, ref #1234)…"
              />
              {paymentError && <p className="text-sm font-bold text-fail-ink">{paymentError}</p>}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void setPaymentStatus('paid')}
                  disabled={settingPayment || data?.payment_status === 'paid'}
                >
                  {settingPayment ? 'Saving…' : 'Mark as paid'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void setPaymentStatus('unpaid')}
                  disabled={settingPayment || data?.payment_status !== 'paid'}
                >
                  Mark as unpaid
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <p className="meta">Manually unlock a week</p>
          <p className="mt-1.5 text-[13.5px] text-muted">Requires a reason — this is logged and visible in the audit trail.</p>
          <div className="mt-4 space-y-3">
            <SelectField value={unlockWeekId} onChange={(e) => setUnlockWeekId(e.target.value)}>
              <option value="">Select a locked week…</option>
              {lockedWeeks.map((w) => (
                <option key={w.week_id} value={w.week_id}>
                  Week {w.position}: {w.title}
                </option>
              ))}
            </SelectField>
            <Field value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} placeholder="Reason (required)…" />
            {unlockError && <p className="text-sm font-bold text-fail-ink">{unlockError}</p>}
            <Button type="button" variant="primary" onClick={() => void manualUnlock()} disabled={unlocking || !unlockWeekId || !unlockReason.trim()}>
              {unlocking ? 'Unlocking…' : 'Unlock'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
