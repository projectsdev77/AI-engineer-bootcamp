import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import type { Profile } from '@/types/database'

interface StudentRow extends Profile {
  mentorName: string | null
}

function useStudents() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      const studentIds = (profiles ?? []).map((p) => p.id)
      const { data: assignments } = studentIds.length
        ? await supabase
            .from('mentor_assignments')
            .select('student_id, mentor_id')
            .in('student_id', studentIds)
            .eq('is_active', true)
        : { data: [] }

      const mentorIds = [...new Set((assignments ?? []).map((a) => a.mentor_id))]
      const { data: mentors } = mentorIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', mentorIds)
        : { data: [] }

      const mentorNameById = new Map((mentors ?? []).map((m) => [m.id, m.full_name]))
      const mentorIdByStudent = new Map((assignments ?? []).map((a) => [a.student_id, a.mentor_id]))

      setStudents(
        ((profiles ?? []) as Profile[]).map((p) => ({
          ...p,
          mentorName: mentorNameById.get(mentorIdByStudent.get(p.id) ?? '') ?? null,
        })),
      )
      setLoading(false)
    })()
  }, [])

  return { students, loading }
}

export default function StudentsListPage() {
  const { students, loading } = useStudents()

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <div className="mt-6 space-y-2">
          {students.map((s) => (
            <Link
              key={s.id}
              to={`/admin/students/${s.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
            >
              <div>
                <p className="font-medium text-slate-900">{s.full_name ?? 'Unnamed student'}</p>
                <p className="text-xs text-slate-400">
                  {s.mentorName ? `Mentor: ${s.mentorName}` : 'No mentor assigned'}
                </p>
              </div>
              {s.status === 'suspended' && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Suspended
                </span>
              )}
            </Link>
          ))}
          {students.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No students yet.</p>}
        </div>
      </main>
    </div>
  )
}
