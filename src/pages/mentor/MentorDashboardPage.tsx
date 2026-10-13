import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useMentorStudents } from '@/hooks/useMentorStudents'
import { useExceptionQueue } from '@/hooks/useExceptionQueue'
import { MESSAGES_READ_EVENT } from '@/hooks/useUnreadMessages'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Card from '@/components/ui/Card'
import StatusPill from '@/components/ui/StatusPill'

function timeAgo(iso: string | null): string {
  if (!iso) return 'never active'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'active today'
  if (days === 1) return 'active yesterday'
  return `active ${days} days ago`
}

/** Unread message count per assigned student — which one to check, not just that one did. */
function useUnreadByStudent() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('messages').select('student_id').neq('sender_id', user.id).is('read_at', null)
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      map.set(row.student_id, (map.get(row.student_id) ?? 0) + 1)
    }
    setCounts(map)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Catches reading a student's thread without leaving this page mounted
  // (e.g. a future embedded thread view) — clears the badge right away
  // instead of only on the next navigation back to this page.
  useEffect(() => {
    const handler = () => void refresh()
    window.addEventListener(MESSAGES_READ_EVENT, handler)
    return () => window.removeEventListener(MESSAGES_READ_EVENT, handler)
  }, [refresh])

  return counts
}

/**
 * Bookings live entirely in Cal.com (per the client spec, the app keeps no
 * booking records), so this only shows whether students can book the mentor
 * and points to where their sessions actually are.
 */
function CoachingCard() {
  const { profile } = useAuth()
  const bookable = !!profile?.cal_link

  return (
    <Card className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 max-w-xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-lg font-bold text-ink">1-on-1 coaching</p>
          {bookable ? (
            <StatusPill variant="pass">bookable</StatusPill>
          ) : (
            <StatusPill variant="locked">not set up</StatusPill>
          )}
        </div>
        <p className="mt-1 text-[14px] text-muted">
          {bookable
            ? 'Any paid student can book you from their coaching page. Your sessions are in Cal.com and your calendar, and you get an email for each booking.'
            : "Students can't book you yet. Add your Cal.com link in Settings to appear on their coaching page."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {bookable && (
          <a
            href="https://app.cal.com/bookings/upcoming"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs font-bold uppercase tracking-wide text-blue-700"
          >
            your bookings ↗
          </a>
        )}
        <Link to="/settings" className="font-mono text-xs font-bold uppercase tracking-wide text-blue-700">
          {bookable ? 'edit in settings →' : 'set up in settings →'}
        </Link>
      </div>
    </Card>
  )
}

export default function MentorDashboardPage() {
  const { students, loading, error } = useMentorStudents()
  const { open: openQueueItems } = useExceptionQueue()
  const unreadByStudent = useUnreadByStudent()

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
              [ {students.length} assigned ]
            </p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Your students</h1>
          </div>
          <Link
            to="/mentor/queue"
            className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-blue-700"
          >
            exception queue →
            {openQueueItems.length > 0 && <span className="pill pill-warn">{openQueueItems.length} open</span>}
          </Link>
        </div>

        <CoachingCard />

        {error && <p className="mt-4 text-sm font-bold text-fail-ink">{error}</p>}

        <div className="mt-6">
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Last activity</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <TR key={student.id}>
                  <TD className="font-bold text-ink">
                    <span className="flex items-center gap-2">
                      {student.full_name ?? 'Unnamed student'}
                      {(unreadByStudent.get(student.id) ?? 0) > 0 && (
                        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fail px-1 font-mono text-[10px] font-bold leading-none text-white">
                          {unreadByStudent.get(student.id)}
                        </span>
                      )}
                    </span>
                  </TD>
                  <TD className="font-mono text-[12px] text-muted">{timeAgo(student.last_active_at)}</TD>
                  <TD className="text-right">
                    <Link to={`/mentor/students/${student.id}`} className="font-mono text-[11.5px] font-bold uppercase text-blue-700 no-underline hover:underline">
                      view →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {students.length === 0 && (
            <p className="py-8 text-center font-mono text-xs font-bold uppercase text-muted">No students assigned yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
