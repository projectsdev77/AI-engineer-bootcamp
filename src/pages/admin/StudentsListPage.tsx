import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Field } from '@/components/ui/Field'
import StatusPill from '@/components/ui/StatusPill'
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
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => (s.full_name ?? '').toLowerCase().includes(q) || (s.mentorName ?? '').toLowerCase().includes(q))
  }, [students, query])

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ {students.length} total ]</p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Students</h1>
          </div>
          <Field value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="w-64" />
        </div>

        <div className="mt-6">
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Mentor</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((s) => (
                <TR key={s.id}>
                  <TD className="font-bold text-ink">{s.full_name ?? 'Unnamed student'}</TD>
                  <TD className="text-[13.5px] text-muted">{s.mentorName ?? 'No mentor assigned'}</TD>
                  <TD>{s.status === 'suspended' ? <StatusPill variant="fail">suspended</StatusPill> : <StatusPill variant="pass">active</StatusPill>}</TD>
                  <TD className="text-right">
                    <Link to={`/admin/students/${s.id}`} className="font-mono text-[11.5px] font-bold uppercase text-blue-700 no-underline hover:underline">
                      view →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {filtered.length === 0 && <p className="py-8 text-center font-mono text-xs font-bold uppercase text-muted">No students found.</p>}
        </div>
      </main>
    </div>
  )
}
