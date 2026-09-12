import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Assignment, QuizConfig, Submission, TextConfig, UrlConfig } from '@/types/database'

export interface QuizQuestionWithOptions {
  id: string
  position: number
  prompt: string
  explanation: string | null
  options: { id: string; position: number; text: string }[]
}

const ONE_MINUTE_MS = 60_000

export function useAssignmentDetail(assignmentId: string | undefined) {
  const { user } = useAuth()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [questions, setQuestions] = useState<QuizQuestionWithOptions[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    if (!assignmentId || !user) return
    setLoading(true)
    setError(null)

    try {
      const assignmentRes = await supabase.from('assignments').select('*').eq('id', assignmentId).single()
      if (assignmentRes.error) throw assignmentRes.error
      const loadedAssignment = assignmentRes.data as Assignment
      setAssignment(loadedAssignment)

      if (loadedAssignment.assignment_type === 'quiz') {
        const [questionsRes, optionsRes] = await Promise.all([
          supabase
            .from('quiz_questions')
            .select('id, position, prompt, explanation')
            .eq('assignment_id', assignmentId)
            .order('position'),
          supabase
            .from('quiz_options_for_student')
            .select('id, question_id, position, text')
            .order('position'),
        ])
        if (questionsRes.error) throw questionsRes.error
        if (optionsRes.error) throw optionsRes.error

        const optionsByQuestion = new Map<string, { id: string; position: number; text: string }[]>()
        for (const o of optionsRes.data ?? []) {
          const list = optionsByQuestion.get(o.question_id) ?? []
          list.push({ id: o.id, position: o.position, text: o.text })
          optionsByQuestion.set(o.question_id, list)
        }
        setQuestions(
          (questionsRes.data ?? []).map((q) => ({ ...q, options: optionsByQuestion.get(q.id) ?? [] })),
        )
      } else {
        setQuestions([])
      }

      const submissionsRes = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })
      if (submissionsRes.error) throw submissionsRes.error
      setSubmissions((submissionsRes.data ?? []) as Submission[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }, [assignmentId, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const latest = submissions[0] ?? null
  const secondsUntilNextAttempt = latest
    ? Math.max(0, Math.ceil((new Date(latest.submitted_at).getTime() + ONE_MINUTE_MS - Date.now()) / 1000))
    : 0

  // Covers revisiting an assignment whose latest submission was left
  // pending/processing from an earlier visit (tab closed or reloaded mid
  // grading) — without this, only a fresh submission's own invoke call
  // would ever trigger a poll, and a reload would just show the same
  // stale "evaluating" state forever.
  useEffect(() => {
    if (!latest || (latest.evaluation_status !== 'pending' && latest.evaluation_status !== 'processing')) return
    let cancelled = false
    void (async () => {
      await pollUntilGraded(latest.id)
      if (!cancelled) await refresh()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id, latest?.evaluation_status])

  async function submitText(content: string) {
    if (!assignment || !user) return
    setSubmitting(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          assignment_id: assignment.id,
          attempt_number: (latest?.attempt_number ?? 0) + 1,
          content,
          assignment_version: {
            instructions: assignment.instructions,
            rubric: assignment.rubric,
            config: assignment.config,
          },
        })
        .select()
        .single()
      if (error) throw error
      await invokeEvaluation(data.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitQuiz(answers: Record<string, string>) {
    if (!assignment || !user) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: submission, error: subError } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          assignment_id: assignment.id,
          attempt_number: (latest?.attempt_number ?? 0) + 1,
          assignment_version: { instructions: assignment.instructions, config: assignment.config },
        })
        .select()
        .single()
      if (subError) throw subError

      const rows = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        submission_id: submission.id,
        question_id,
        selected_option_id,
      }))
      if (rows.length) {
        const { error: answersError } = await supabase.from('quiz_answers').insert(rows)
        if (answersError) throw answersError
      }

      await invokeEvaluation(submission.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function invokeEvaluation(submissionId: string) {
    // Grading (quiz) and AI feedback (text/url) both happen server-side
    // with the service role, per section 7 — the client only kicks it off.
    // The function call itself blocks until grading finishes, but a slow
    // connection, a cold start, or a dropped request can make this call
    // fail or time out client-side even when the function keeps running
    // (and eventually finishes) on the server — so don't treat a single
    // invoke as the only chance to see the result: fall through to polling
    // either way.
    try {
      const { error } = await supabase.functions.invoke('evaluate-submission', {
        body: { submissionId },
      })
      if (error) console.error('evaluate-submission invoke failed', error)
    } catch (e) {
      console.error('evaluate-submission invoke threw', e)
    }
    await pollUntilGraded(submissionId)
  }

  // Polls the submission row until it leaves 'pending'/'processing', instead
  // of trusting the single refresh() right after invokeEvaluation — that
  // trusted the invoke's own HTTP round trip to reflect the true end state,
  // which left the UI stuck showing "Evaluating…" forever whenever that one
  // round trip errored, timed out, or raced ahead of the server's write.
  async function pollUntilGraded(submissionId: string, timeoutMs = 90_000, intervalMs = 3_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const { data } = await supabase
        .from('submissions')
        .select('evaluation_status')
        .eq('id', submissionId)
        .maybeSingle()
      if (data && data.evaluation_status !== 'pending' && data.evaluation_status !== 'processing') return
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  async function flagForReview(reason: string) {
    if (!latest) return
    setError(null)
    const { error } = await supabase.rpc('flag_submission_for_review', {
      p_submission_id: latest.id,
      p_reason: reason,
    })
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  return {
    assignment,
    questions,
    submissions,
    latest,
    secondsUntilNextAttempt,
    loading,
    submitting,
    error,
    submitText,
    submitQuiz,
    flagForReview,
    refresh,
  }
}

export function textConfig(assignment: Assignment): TextConfig {
  return assignment.config as TextConfig
}
export function urlConfig(assignment: Assignment): UrlConfig {
  return assignment.config as UrlConfig
}
export function quizConfig(assignment: Assignment): QuizConfig {
  return assignment.config as QuizConfig
}
