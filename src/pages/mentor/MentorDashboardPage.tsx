import { Link } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useMentorStudents } from '@/hooks/useMentorStudents'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'

function timeAgo(iso: string | null): string {
  if (!iso) return 'never active'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'active today'
  if (days === 1) return 'active yesterday'
  return `active ${days} days ago`
}

export default function MentorDashboardPage() {
  const { students, loading, error } = useMentorStudents()

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
          <Link to="/mentor/queue" className="font-mono text-xs font-bold uppercase tracking-wide text-blue-700">
            exception queue →
          </Link>
        </div>

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
                  <TD className="font-bold text-ink">{student.full_name ?? 'Unnamed student'}</TD>
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
