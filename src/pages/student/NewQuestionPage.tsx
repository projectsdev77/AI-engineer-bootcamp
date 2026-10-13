import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, FieldHint, Label, SelectField, TextAreaField } from '@/components/ui/Field'
import { AttachmentPicker, CodeBlockButton, FileChips } from '@/components/messages/Composer'
import { uploadAttachments } from '@/lib/messageAttachments'
import { MESSAGES_READ_EVENT } from '@/hooks/useUnreadMessages'

interface WeekOption {
  id: string
  position: number
  title: string
}
interface LessonOption {
  id: string
  position: number
  title: string
}

/** Weeks the student can see (RLS: published and unlocked), and the lessons in the chosen one. */
function useCurriculumOptions(weekId: string) {
  const [weeks, setWeeks] = useState<WeekOption[]>([])
  const [lessons, setLessons] = useState<LessonOption[]>([])

  useEffect(() => {
    void supabase
      .from('weeks')
      .select('id, position, title')
      .eq('status', 'published')
      .order('position')
      .then(({ data }) => setWeeks((data ?? []) as WeekOption[]))
  }, [])

  useEffect(() => {
    if (!weekId) {
      setLessons([])
      return
    }
    let cancelled = false
    void supabase
      .from('lessons')
      .select('id, position, title')
      .eq('week_id', weekId)
      .eq('status', 'published')
      .order('position')
      .then(({ data }) => {
        if (!cancelled) setLessons((data ?? []) as LessonOption[])
      })
    return () => {
      cancelled = true
    }
  }, [weekId])

  return { weeks, lessons }
}

export default function NewQuestionPage() {
  const navigate = useNavigate()
  const [weekId, setWeekId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const { weeks, lessons } = useCurriculumOptions(weekId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!subject.trim()) return setError('Add a subject.')
    if (!body.trim()) return setError('Describe your question.')

    setSubmitting(true)
    // The id is generated here so attachments can go into the ticket's
    // folder before the ticket (and its first message) is created.
    const id = crypto.randomUUID()
    try {
      const attachments = files.length > 0 ? await uploadAttachments(id, files) : []
      const { error: rpcError } = await supabase.rpc('create_ticket', {
        p_id: id,
        p_subject: subject,
        p_body: body,
        p_week_id: weekId || null,
        p_lesson_id: lessonId || null,
        p_attachments: attachments,
      })
      if (rpcError) throw new Error(rpcError.message)
      window.dispatchEvent(new Event(MESSAGES_READ_EVENT))
      navigate(`/questions/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your question was not sent.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <Breadcrumb items={[{ label: 'questions', to: '/questions' }, { label: 'new question' }]} />
      <main className="mx-auto max-w-[760px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-[34px] font-bold tracking-[-0.03em] text-ink">New question</h1>
        <p className="mt-1 text-[15px] text-muted">
          The first available mentor will pick it up. You'll get an email when they reply.
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="q_week">Week</Label>
                <SelectField
                  id="q_week"
                  value={weekId}
                  onChange={(e) => {
                    setWeekId(e.target.value)
                    setLessonId('')
                  }}
                  className="w-full"
                >
                  <option value="">General question</option>
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      Week {w.position} · {w.title}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <Label htmlFor="q_lesson">Lesson</Label>
                <SelectField
                  id="q_lesson"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  disabled={!weekId}
                  className="w-full"
                >
                  <option value="">{weekId ? 'The whole week' : 'Pick a week first'}</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div>
              <Label htmlFor="q_subject">Subject</Label>
              <Field
                id="q_subject"
                value={subject}
                maxLength={200}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. My RAG retriever returns the same chunk every time"
              />
            </div>

            <div>
              <Label htmlFor="q_body">Message</Label>
              <TextAreaField
                ref={bodyRef}
                id="q_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full resize-y"
                placeholder="What are you trying to do, what did you try, and what happened?"
              />
              <FieldHint>
                Use the code button (or triple backticks) to keep code formatted. You can attach screenshots, PDFs or
                code files (up to 10 MB each).
              </FieldHint>
            </div>

            <div className="space-y-2">
              <FileChips files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
              <div className="flex items-center gap-4">
                <CodeBlockButton textarea={bodyRef} value={body} onChange={setBody} disabled={submitting} />
                <AttachmentPicker files={files} onChange={setFiles} onError={setError} disabled={submitting} />
              </div>
            </div>

            {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send question'}
              </Button>
              <LinkButton to="/questions" variant="secondary">
                Cancel
              </LinkButton>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
