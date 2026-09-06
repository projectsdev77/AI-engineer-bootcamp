import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Lesson, Resource, ResourceType } from '@/types/database'

const RESOURCE_TYPES: ResourceType[] = ['video', 'article', 'docs', 'paper', 'repo', 'tool', 'other']

function useLesson(lessonId: string | undefined) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!lessonId) return
    setLoading(true)
    const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).single()
    setLesson(data as Lesson)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  return { lesson, loading, refresh }
}

export default function LessonEditorPage() {
  const { lessonId } = useParams()
  const { lesson, loading, refresh } = useLesson(lessonId)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', estimated_minutes: '' })
  const [newResource, setNewResource] = useState({ title: '', url: '', resource_type: 'article' as ResourceType })

  const resources = useAdminCollection<Resource>('resources', 'lesson_id', lessonId)

  useEffect(() => {
    if (lesson) {
      setForm({
        title: lesson.title,
        body: lesson.body ?? '',
        estimated_minutes: lesson.estimated_minutes != null ? String(lesson.estimated_minutes) : '',
      })
    }
  }, [lesson])

  async function saveLesson() {
    if (!lessonId) return
    setSaving(true)
    await supabase
      .from('lessons')
      .update({
        title: form.title,
        body: form.body || null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      })
      .eq('id', lessonId)
    setSaving(false)
    await refresh()
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to={lesson ? `/admin/curriculum/weeks/${lesson.week_id}` : '/admin/curriculum'} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to week
        </Link>

        {lesson && (
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
                <label className="block text-xs font-medium text-slate-500">
                  Framing (markdown) — keep it short, the substance is in the resources
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={8}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Estimated minutes</label>
                  <input
                    type="number"
                    value={form.estimated_minutes}
                    onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })}
                    className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => void saveLesson()}
                  disabled={saving}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resources</h2>
              <div className="mt-3 space-y-2">
                {resources.items.map((resource, i) => (
                  <div key={resource.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <ReorderButtons
                        canMoveUp={i > 0}
                        canMoveDown={i < resources.items.length - 1}
                        onMoveUp={() => void resources.moveUp(resource.id)}
                        onMoveDown={() => void resources.moveDown(resource.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{resource.title}</p>
                        <a href={resource.url} target="_blank" rel="noreferrer" className="truncate text-xs text-brand-600 hover:underline">
                          {resource.url}
                        </a>
                        {resource.is_broken && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            Broken
                          </span>
                        )}
                      </div>
                      <select
                        value={resource.resource_type}
                        onChange={(e) => void resources.update(resource.id, { resource_type: e.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {RESOURCE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={resource.is_required}
                          onChange={(e) => void resources.update(resource.id, { is_required: e.target.checked })}
                        />
                        Required
                      </label>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${resource.title}"?`)) void resources.remove(resource.id)
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newResource.title.trim() || !newResource.url.trim()) return
                    void resources.create({
                      title: newResource.title.trim(),
                      url: newResource.url.trim(),
                      resource_type: newResource.resource_type,
                      is_required: true,
                    })
                    setNewResource({ title: '', url: '', resource_type: 'article' })
                  }}
                  className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <input
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Resource title…"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    placeholder="https://…"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={newResource.resource_type}
                    onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as ResourceType })}
                    className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
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
