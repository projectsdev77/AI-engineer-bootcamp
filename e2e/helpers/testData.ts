// Content lookups used by specs to jump straight to a concrete
// week/lesson/assignment URL instead of brittle multi-page UI traversal.
// These go through the *anon* client signed in as the real test student —
// same as the app itself — so RLS (has_week_unlock, published-only, etc.)
// is exercised for real, not bypassed. The only thing this skips is
// clicking through Dashboard -> Week -> Lesson to find the right link.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadTestEnv, requireEnv } from './env'
import { supabaseAdmin } from './supabaseAdmin'

let cachedStudentClient: SupabaseClient | undefined

export async function studentClient(): Promise<SupabaseClient> {
  if (cachedStudentClient) return cachedStudentClient
  const env = loadTestEnv()
  requireEnv(env, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'TEST_STUDENT_EMAIL', 'TEST_STUDENT_PASSWORD'])
  const client = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!)
  const { error } = await client.auth.signInWithPassword({
    email: env.TEST_STUDENT_EMAIL!,
    password: env.TEST_STUDENT_PASSWORD!,
  })
  if (error) throw new Error(`Could not sign in as the test student to look up content: ${error.message}`)
  cachedStudentClient = client
  return client
}

export interface WeekRef {
  id: string
  position: number
  title: string
}

/** The lowest-position published, unlocked-for-the-test-student week (normally week 1). */
export async function findUnlockedWeek(): Promise<WeekRef | null> {
  const client = await studentClient()
  const { data, error } = await client.from('weeks').select('id, position, title').order('position', { ascending: true }).limit(1)
  if (error) throw error
  return (data?.[0] as WeekRef | undefined) ?? null
}

export interface AssignmentRef {
  id: string
  weekId: string
  title: string
  type: 'quiz' | 'text' | 'url'
}

/**
 * The `offset`-th visible assignment of the given type (0 = first),
 * searched across every week the test student can currently see. `offset`
 * lets two tests use distinct assignments of the same type deliberately —
 * e.g. so they don't collide with each other's 60s per-assignment
 * submission cooldown.
 */
export async function findAssignmentByType(type: 'quiz' | 'text' | 'url', offset = 0): Promise<AssignmentRef | null> {
  const client = await studentClient()
  const { data, error } = await client
    .from('assignments')
    .select('id, week_id, title, assignment_type')
    .eq('assignment_type', type)
    .order('created_at', { ascending: true })
    .range(offset, offset)
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  return { id: row.id, weekId: row.week_id, title: row.title, type: row.assignment_type }
}

export interface LessonRef {
  id: string
  weekId: string
  title: string
  requiredResourceCount: number
  hasNextLesson: boolean
}

/**
 * First visible lesson that (a) has at least one required resource, and
 * (b) is not the last lesson in its week — so the Continue button has
 * somewhere to go once gating is satisfied, instead of staying disabled
 * regardless (LessonPage.tsx: disabled={!completedAt || !nextLesson}).
 */
export async function findLessonWithRequiredResource(): Promise<LessonRef | null> {
  const client = await studentClient()
  const { data: lessons, error } = await client.from('lessons').select('id, week_id, title, position').order('position', { ascending: true })
  if (error) throw error

  const lessonsByWeek = new Map<string, typeof lessons>()
  for (const lesson of lessons ?? []) {
    const list = lessonsByWeek.get(lesson.week_id) ?? []
    list.push(lesson)
    lessonsByWeek.set(lesson.week_id, list)
  }

  for (const lesson of lessons ?? []) {
    const weekLessons = (lessonsByWeek.get(lesson.week_id) ?? []).sort((a, b) => a.position - b.position)
    const hasNextLesson = weekLessons[weekLessons.length - 1]?.id !== lesson.id
    if (!hasNextLesson) continue

    const { data: resources, error: resErr } = await client
      .from('resources')
      .select('id, is_required')
      .eq('lesson_id', lesson.id)
      .eq('is_required', true)
    if (resErr) throw resErr
    if ((resources ?? []).length > 0) {
      return {
        id: lesson.id,
        weekId: lesson.week_id,
        title: lesson.title,
        requiredResourceCount: resources!.length,
        hasNextLesson: true,
      }
    }
  }
  return null
}

export interface AssignmentDetail {
  id: string
  title: string
  instructions: string
  assignment_type: 'quiz' | 'text' | 'url'
  config: Record<string, unknown>
}

export async function getAssignment(assignmentId: string): Promise<AssignmentDetail> {
  const client = await studentClient()
  const { data, error } = await client.from('assignments').select('*').eq('id', assignmentId).single()
  if (error) throw error
  return data as AssignmentDetail
}

export interface QuizAnswerKey {
  correctOptionByQuestion: Map<string, string>
  totalQuestions: number
}

/**
 * Correct-answer key for a quiz, read with the service-role client — the
 * same reason a human test author would keep an answer key off to the
 * side: RLS deliberately hides quiz_options.is_correct from the student
 * session (section 7), and this suite must not weaken that to test it.
 * The UI is still driven for real, one radio click at a time.
 */
export async function quizCorrectAnswers(assignmentId: string): Promise<QuizAnswerKey> {
  const db = supabaseAdmin()
  const { data: questions, error } = await db.from('quiz_questions').select('id').eq('assignment_id', assignmentId)
  if (error) throw error
  const questionIds = (questions ?? []).map((q) => q.id as string)
  const { data: options, error: optErr } = questionIds.length
    ? await db.from('quiz_options').select('id, question_id, is_correct').in('question_id', questionIds)
    : { data: [] as { id: string; question_id: string; is_correct: boolean }[], error: null }
  if (optErr) throw optErr
  const correctOptionByQuestion = new Map<string, string>()
  for (const o of options ?? []) {
    if (o.is_correct) correctOptionByQuestion.set(o.question_id, o.id)
  }
  return { correctOptionByQuestion, totalQuestions: questionIds.length }
}
