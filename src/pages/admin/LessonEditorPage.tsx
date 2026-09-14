import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { Button } from '@/components/ui/Button'
import { Field, Label, TextAreaField, FieldError } from '@/components/ui/Field'
import { Checkbox } from '@/components/ui/Checkbox'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { Lesson, Resource, ResourceType } from '@/types/database'

const RESOURCE_TYPES: ResourceType[] = ['video', 'article', 'docs', 'paper', 'repo', 'tool', 'other']

function ResourceRow({
  resource,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
}: {
  resource: Resource
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (fields: Partial<Resource>) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.url)

  useEffect(() => setTitle(resource.title), [resource.title])
  useEffect(() => setUrl(resource.url), [resource.url])

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        <ReorderButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${resource.is_broken ? 'bg-fail' : 'bg-pass'}`}
          title={resource.is_broken ? 'Broken link' : 'Link healthy'}
        />
        <select
          value={resource.resource_type}
          onChange={(e) => onUpdate({ resource_type: e.target.value as ResourceType })}
          className="rounded-full border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink"
        >
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
          <Field
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && onUpdate({ title: title.trim() })}
            placeholder="Resource title…"
          />
          <Field
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url.trim() && onUpdate({ url: url.trim() })}
            className="font-mono text-[12px]"
            placeholder="https://…"
          />
        </div>
        <Checkbox
          checked={resource.is_required}
          onChange={(checked) => onUpdate({ is_required: checked })}
          label={<span className="font-mono text-[11px] font-bold uppercase text-muted">required</span>}
        />
        <button
          onClick={() => {
            if (confirm(`Delete "${resource.title}"?`)) onDelete()
          }}
          className="font-mono text-[11px] font-bold uppercase text-fail-ink hover:underline"
        >
          del
        </button>
      </div>
    </div>
  )
}

function useLesson(lessonId: string | undefined) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!lessonId) return
    // Deliberately not setLoading(true) here: saveLesson() also calls
    // refresh(), and flipping loading back to true would unmount the
    // whole editor back to a full-page spinner on every save.
    const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).single()
    setLesson(data as Lesson)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  return { lesson, loading, refresh }
}

export default function LessonEditorPage() {
  const { lessonId } = useParams()
  const { lesson, loading, refresh } = useLesson(lessonId)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', estimated_minutes: '' })
  const [newResource, setNewResource] = useState({ title: '', url: '', resource_type: 'article' as ResourceType })
  const [newResourceError, setNewResourceError] = useState<string | null>(null)

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
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
    await refresh()
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      {lesson && (
        <div className="border-b-2 border-hairline bg-surface">
          <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <Breadcrumb items={[{ label: 'curriculum', to: '/admin/curriculum' }, { label: 'week', to: `/admin/curriculum/weeks/${lesson.week_id}` }, { label: 'lesson' }]} />
            <div className="flex items-center gap-3">
              {justSaved && <span className="font-mono text-[11px] font-bold uppercase text-pass-ink">saved</span>}
              <Button type="button" variant="primary" size="sm" onClick={() => void saveLesson()} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        {lesson && (
          <>
            <Card className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Field id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="body">
                  Framing (markdown) <span className="normal-case text-faint">· keep it short, the substance is in the resources</span>
                </Label>
                <TextAreaField
                  id="body"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={8}
                  className="font-mono text-[13px]"
                />
              </div>
              <div>
                <Label htmlFor="minutes">Estimated minutes</Label>
                <Field
                  id="minutes"
                  type="number"
                  value={form.estimated_minutes}
                  onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })}
                  className="w-28"
                />
              </div>
            </Card>

            <section className="mt-8">
              <p className="meta">Resources · {resources.items.length}</p>
              <div className="mt-3 space-y-2">
                {resources.items.map((resource, i) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    canMoveUp={i > 0}
                    canMoveDown={i < resources.items.length - 1}
                    onMoveUp={() => void resources.moveUp(resource.id)}
                    onMoveDown={() => void resources.moveDown(resource.id)}
                    onUpdate={(fields) => void resources.update(resource.id, fields)}
                    onDelete={() => void resources.remove(resource.id)}
                  />
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newResource.title.trim() || !newResource.url.trim()) {
                      setNewResourceError('Title and URL are both required.')
                      return
                    }
                    setNewResourceError(null)
                    void resources.create({
                      title: newResource.title.trim(),
                      url: newResource.url.trim(),
                      resource_type: newResource.resource_type,
                      is_required: true,
                    })
                    setNewResource({ title: '', url: '', resource_type: 'article' })
                  }}
                  className="rounded-panel border-2 border-dashed border-disabled p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <Field
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="Resource title…"
                      error={Boolean(newResourceError) && !newResource.title.trim()}
                    />
                    <Field
                      value={newResource.url}
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                      placeholder="https://…"
                      error={Boolean(newResourceError) && !newResource.url.trim()}
                    />
                    <select
                      value={newResource.resource_type}
                      onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as ResourceType })}
                      className="field w-auto"
                    >
                      {RESOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="primary">
                      Add
                    </Button>
                  </div>
                  {newResourceError && <FieldError>{newResourceError}</FieldError>}
                  {resources.error && <FieldError>{resources.error}</FieldError>}
                </form>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
