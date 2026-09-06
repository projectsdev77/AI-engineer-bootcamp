import { Link } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useMentorStudents } from '@/hooks/useMentorStudents'

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
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Your students</h1>
          <Link to="/mentor/queue" className="text-sm font-medium text-brand-600 hover:underline">
            Exception queue →
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-3">
          {students.map((student) => (
            <Link
              key={student.id}
              to={`/mentor/students/${student.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
            >
              <div>
                <p className="font-medium text-slate-900">{student.full_name ?? 'Unnamed student'}</p>
                <p className="text-xs text-slate-400">{timeAgo(student.last_active_at)}</p>
              </div>
              <span className="text-sm text-slate-400">View →</span>
            </Link>
          ))}
          {students.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No students assigned yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
