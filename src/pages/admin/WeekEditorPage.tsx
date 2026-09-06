import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import StatusToggle from '@/components/admin/StatusToggle'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Assignment, Lesson, Week } from '@/types/database'

function useWeek(weekId: string | undefined) {
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!weekId) return
    setLoading(true)
    const { data } = await supabase.from('weeks').select('*').eq('id', weekId).single()
    setWeek(data as Week)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId])

  return { week, loading, refresh }
}

export default function WeekEditorPage() {
  const { weekId } = useParams()
  const { week, loading, refresh } = useWeek(weekId)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', goal: '', summary: '', estimated_hours: '' })
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newAssignment, setNewAssignment] = useState({ title: '', type: 'text' as Assignment['assignment_type'] })

  const lessons = useAdminCollection<Lesson>('lessons', 'week_id', weekId)
  const assignments = useAdminCollection<Assignment>('assignments', 'week_id', weekId)

  useEffect(() => {
    if (week) {
      setForm({
        title: week.title,
        goal: week.goal ?? '',
        summary: week.summary ?? '',
        estimated_hours: week.estimated_hours != null ? String(week.estimated_hours) : '',
      })
    }
  }, [week])

  async function saveWeek() {
    if (!weekId) return
    setSaving(true)
    await supabase
      .from('weeks')
      .update({
        title: form.title,
        goal: form.goal || null,
        summary: form.summary || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      })
      .eq('id', weekId)
    setSaving(false)
    await refresh()
  }

  function slugify(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/admin/curriculum" className="text-sm text-slate-500 hover:text-slate-700">
          ← Curriculum
        </Link>

        {week && (
          <>
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <label className="block text-xs font-medium text-slate-500">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Goal</label>
                <input
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="What the student should be able to do"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Estimated hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.estimated_hours}
                    onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                    className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => void saveWeek()}
                  disabled={saving}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lessons</h2>
              <div className="mt-3 space-y-2">
                {lessons.items.map((lesson, i) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <ReorderButtons
                      canMoveUp={i > 0}
                      canMoveDown={i < lessons.items.length - 1}
                      onMoveUp={() => void lessons.moveUp(lesson.id)}
                      onMoveDown={() => void lessons.moveDown(lesson.id)}
                    />
                    <Link to={`/admin/curriculum/lessons/${lesson.id}`} className="min-w-0 flex-1 text-sm font-medium text-slate-900">
                      {lesson.title}
                    </Link>
                    <StatusToggle
                      status={lesson.status}
                      onChange={(next) => void lessons.update(lesson.id, { status: next })}
                    />
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${lesson.title}"?`)) void lessons.remove(lesson.id)
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newLessonTitle.trim()) return
                    void lessons.create({
                      title: newLessonTitle.trim(),
                      slug: slugify(newLessonTitle),
                      status: 'draft',
                    })
                    setNewLessonTitle('')
                  }}
                  className="flex gap-2 rounded-lg border border-dashed border-slate-300 p-3"
                >
                  <input
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="New lesson title…"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                    Add lesson
                  </button>
                </form>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assignments</h2>
              <div className="mt-3 space-y-2">
                {assignments.items.map((assignment, i) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <ReorderButtons
                      canMoveUp={i > 0}
                      canMoveDown={i < assignments.items.length - 1}
                      onMoveUp={() => void assignments.moveUp(assignment.id)}
                      onMoveDown={() => void assignments.moveDown(assignment.id)}
                    />
                    <Link
                      to={`/admin/curriculum/assignments/${assignment.id}`}
                      className="min-w-0 flex-1 text-sm font-medium text-slate-900"
                    >
                      {assignment.title}
                      <span className="ml-2 text-xs uppercase text-slate-400">{assignment.assignment_type}</span>
                    </Link>
                    <StatusToggle
                      status={assignment.status}
                      onChange={(next) => void assignments.update(assignment.id, { status: next })}
                    />
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${assignment.title}"?`)) void assignments.remove(assignment.id)
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newAssignment.title.trim()) return
                    const config =
                      newAssignment.type === 'quiz'
                        ? { pass_threshold: 70 }
                        : newAssignment.type === 'text'
                          ? { min_words: 150, max_words: 800 }
                          : { allowed_hosts: [], require_public: true }
                    void assignments.create({
                      title: newAssignment.title.trim(),
                      instructions: 'TODO: add instructions',
                      assignment_type: newAssignment.type,
                      config,
                      status: 'draft',
                    })
                    setNewAssignment({ title: '', type: 'text' })
                  }}
                  className="flex gap-2 rounded-lg border border-dashed border-slate-300 p-3"
                >
                  <input
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="New assignment title…"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={newAssignment.type}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, type: e.target.value as Assignment['assignment_type'] })
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="url">URL</option>
                    <option value="quiz">Quiz</option>
                  </select>
                  <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                    Add
                  </button>
                </form>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
