import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useExceptionQueue } from '@/hooks/useExceptionQueue'
import QueueCard from '@/components/queue/QueueCard'
import { IllEmptyQueue } from '@/components/ui/illustrations'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/types/database'

/** Admin-only: every mentor, plus each open item's student's current mentor, so
 * the queue can offer a reassignment select without a per-card round trip. */
function useMentorAssignData(enabled: boolean, studentIds: string[]) {
  const [mentors, setMentors] = useState<Profile[]>([])
  const [currentMentorByStudent, setCurrentMentorByStudent] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!enabled) return
    void supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mentor')
      .then(({ data }) => setMentors((data ?? []) as Profile[]))
  }, [enabled])

  useEffect(() => {
    if (!enabled || studentIds.length === 0) return
    void supabase
      .from('mentor_assignments')
      .select('student_id, mentor_id')
      .in('student_id', studentIds)
      .eq('is_active', true)
      .then(({ data }) => setCurrentMentorByStudent(new Map((data ?? []).map((a) => [a.student_id, a.mentor_id]))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, studentIds.join(',')])

  return { mentors, currentMentorByStudent }
}

export default function ExceptionQueuePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { open, resolved, loading, error, resolve } = useExceptionQueue()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')

  const { mentors, currentMentorByStudent } = useMentorAssignData(isAdmin, open.map((i) => i.user_id))

  async function reassign(studentId: string, mentorId: string) {
    await supabase.rpc('admin_reassign_mentor', { p_student_id: studentId, p_mentor_id: mentorId })
    setCurrentMentorOverride(studentId, mentorId)
  }

  // Optimistic local override so the select reflects the change immediately.
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map())
  function setCurrentMentorOverride(studentId: string, mentorId: string) {
    setOverrides((prev) => new Map(prev).set(studentId, mentorId))
  }

  if (loading) return <FullPageSpinner />

  const list = tab === 'open' ? open : resolved

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
              [ worklist · oldest first ]
            </p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Exception queue</h1>
            <p className="mt-1 text-[15px] text-muted">
              {isAdmin ? 'Every submission needing human review.' : 'Submissions where AI evaluation failed, or a student asked for a second look.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('open')}
              className={`rounded-full border-2 border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide ${
                tab === 'open' ? 'bg-ink text-paper' : 'bg-surface text-ink'
              }`}
            >
              Needs attention ({open.length})
            </button>
            <button
              onClick={() => setTab('resolved')}
              className={`rounded-full border-2 border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide ${
                tab === 'resolved' ? 'bg-ink text-paper' : 'bg-surface text-ink'
              }`}
            >
              Resolved ({resolved.length})
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-bold text-fail-ink">{error}</p>}

        <div className="mt-6 space-y-4">
          {list.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              onResolve={tab === 'open' ? (status, feedback) => resolve(item.id, status, feedback) : undefined}
              mentorAssign={
                isAdmin && tab === 'open'
                  ? {
                      mentors,
                      currentMentorId: overrides.get(item.user_id) ?? currentMentorByStudent.get(item.user_id) ?? null,
                      onReassign: (mentorId) => void reassign(item.user_id, mentorId),
                    }
                  : undefined
              }
            />
          ))}
          {list.length === 0 && (
            <div className="rounded-panel border-2 border-dashed border-disabled p-10 text-center">
              <div className="ill-frame mx-auto aspect-[220/130] w-[220px] text-ink">
                <IllEmptyQueue />
              </div>
              <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wide text-muted">
                {tab === 'open' ? 'end of queue' : 'nothing resolved yet'}
              </p>
              <p className="mt-1 text-[14.5px] text-muted">
                {tab === 'open' ? 'Nothing else needs attention right now.' : 'Resolved items will show up here.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
