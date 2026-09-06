import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import ProgressBar from '@/components/ui/ProgressBar'
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
  const { data, loading: progressLoading, error } = useProgressOverview(studentId)
  const mentors = useMentorOptions()
  const { mentorId, refresh: refreshMentor } = useCurrentMentor(studentId)
  const [reassigning, setReassigning] = useState(false)

  const [unlockWeekId, setUnlockWeekId] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

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
      setUnlockError(error.message)
      return
    }
    setUnlockWeekId('')
    setUnlockReason('')
  }

  if (progressLoading) return <FullPageSpinner />

  const overall = data?.overall
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0
  const lockedWeeks = (data?.weeks ?? []).filter((w) => !w.unlocked)

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/admin/students" className="text-sm text-slate-500 hover:text-slate-700">
          ← Students
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {overall && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Overall progress</span>
              <span className="text-sm text-slate-500">{overallPercent}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar percent={overallPercent} />
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <label className="block text-xs font-medium text-slate-500">Assigned mentor</label>
          <select
            value={mentorId ?? ''}
            disabled={reassigning}
            onChange={(e) => void reassignMentor(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select a mentor…
            </option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.id}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <label className="block text-xs font-medium text-slate-500">Manually unlock a week</label>
          <p className="mt-1 text-xs text-slate-400">
            Requires a reason — this is logged and visible in the audit trail.
          </p>
          <div className="mt-2 space-y-2">
            <select
              value={unlockWeekId}
              onChange={(e) => setUnlockWeekId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a locked week…</option>
              {lockedWeeks.map((w) => (
                <option key={w.week_id} value={w.week_id}>
                  Week {w.position}: {w.title}
                </option>
              ))}
            </select>
            <input
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Reason (required)…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {unlockError && <p className="text-xs text-red-600">{unlockError}</p>}
            <button
              onClick={() => void manualUnlock()}
              disabled={unlocking || !unlockWeekId || !unlockReason.trim()}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {unlocking ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
