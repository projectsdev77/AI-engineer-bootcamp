import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import QuizQuestionEditor from '@/components/admin/QuizQuestionEditor'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Assignment, QuizQuestion, TextConfig, UrlConfig, QuizConfig } from '@/types/database'

function useAssignment(assignmentId: string | undefined) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!assignmentId) return
    setLoading(true)
    const { data } = await supabase.from('assignments').select('*').eq('id', assignmentId).single()
    setAssignment(data as Assignment)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  return { assignment, loading, refresh }
}

export default function AssignmentEditorPage() {
  const { assignmentId } = useParams()
  const { assignment, loading, refresh } = useAssignment(assignmentId)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', instructions: '', rubric: '' })
  const [config, setConfig] = useState<Record<string, unknown>>({})

  const questions = useAdminCollection<QuizQuestion>('quiz_questions', 'assignment_id', assignmentId)

  useEffect(() => {
    if (assignment) {
      setForm({
        title: assignment.title,
        instructions: assignment.instructions,
        rubric: assignment.rubric ?? '',
      })
      setConfig(assignment.config as Record<string, unknown>)
    }
  }, [assignment])

  async function save() {
    if (!assignmentId) return
    setSaving(true)
    await supabase
      .from('assignments')
      .update({
        title: form.title,
        instructions: form.instructions,
        rubric: form.rubric || null,
        config,
      })
      .eq('id', assignmentId)
    setSaving(false)
    await refresh()
  }

  async function addQuestion() {
    const question = await questions.create({ prompt: 'New question' })
    if (!question) return
    await supabase.from('quiz_options').insert([
      { question_id: question.id, position: 1, text: 'Option A', is_correct: true },
      { question_id: question.id, position: 2, text: 'Option B', is_correct: false },
    ])
    await questions.refresh()
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to={assignment ? `/admin/curriculum/weeks/${assignment.week_id}` : '/admin/curriculum'} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to week
        </Link>

        {assignment && (
          <>
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-500">
                {assignment.assignment_type}
              </span>
              <div>
                <label className="block text-xs font-medium text-slate-500">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Instructions (markdown, shown to students)</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              {assignment.assignment_type !== 'quiz' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Rubric (sent to the AI grader, never shown to students)
                  </label>
                  <textarea
                    value={form.rubric}
                    onChange={(e) => setForm({ ...form, rubric: e.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {assignment.assignment_type === 'text' && (
                <div className="flex gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Min words</label>
                    <input
                      type="number"
                      value={(config as unknown as TextConfig).min_words ?? ''}
                      onChange={(e) => setConfig({ ...config, min_words: Number(e.target.value) })}
                      className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Max words</label>
                    <input
                      type="number"
                      value={(config as unknown as TextConfig).max_words ?? ''}
                      onChange={(e) => setConfig({ ...config, max_words: Number(e.target.value) })}
                      className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {assignment.assignment_type === 'url' && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500">Allowed hosts (comma-separated)</label>
                    <input
                      value={((config as unknown as UrlConfig).allowed_hosts ?? []).join(', ')}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          allowed_hosts: e.target.value.split(',').map((h) => h.trim()).filter(Boolean),
                        })
                      }
                      placeholder="github.com"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-1 pb-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={Boolean((config as unknown as UrlConfig).require_public)}
                      onChange={(e) => setConfig({ ...config, require_public: e.target.checked })}
                    />
                    Require public
                  </label>
                </div>
              )}

              {assignment.assignment_type === 'quiz' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500">Pass threshold (%)</label>
                  <input
                    type="number"
                    value={(config as unknown as QuizConfig).pass_threshold ?? ''}
                    onChange={(e) => setConfig({ ...config, pass_threshold: Number(e.target.value) })}
                    className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <button
                onClick={() => void save()}
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {assignment.assignment_type === 'quiz' && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Questions</h2>
                <div className="mt-3 space-y-4">
                  {questions.items.map((q, i) => (
                    <QuizQuestionEditor
                      key={q.id}
                      question={q}
                      canMoveUp={i > 0}
                      canMoveDown={i < questions.items.length - 1}
                      onMoveUp={() => void questions.moveUp(q.id)}
                      onMoveDown={() => void questions.moveDown(q.id)}
                      onUpdate={(fields) => questions.update(q.id, fields)}
                      onDelete={() => questions.remove(q.id)}
                    />
                  ))}
                  <button
                    onClick={() => void addQuestion()}
                    className="w-full rounded-lg border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600"
                  >
                    + Add question
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
