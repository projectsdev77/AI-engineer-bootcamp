// Supabase Edge Function: evaluate-submission
//
// Invoked by the client immediately after it inserts a `submissions` row.
// Runs with the service role (bypasses RLS) because it needs to read
// quiz_options.is_correct — the one thing students must never see directly
// (section 7). Quiz grading is deterministic and synchronous; text/url
// assignments get an AI-generated verdict from Gemini (free-tier API key,
// see GEMINI_API_KEY below). Both paths always end with evaluation_status
// either 'complete' or 'failed' — PD-002's two human-review triggers are
// `evaluation_status = 'failed'` (this function giving up) and a student's
// own flag_submission_for_review() call.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildGradingPrompt,
  gradeQuiz,
  parseGradeVerdict,
  quizFeedback,
  type GeminiGenerateContentResponse,
} from './grading.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_MODEL = 'gemini-2.5-flash'

const MAX_AI_EVALS_PER_DAY = 30 // PD-008
const MAX_AI_ATTEMPTS = 2 // "AI evaluation failed after retries" (PD-002)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  let submissionId: string | undefined
  try {
    ;({ submissionId } = await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!submissionId) return jsonResponse({ error: 'submissionId is required' }, 400)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('*, assignments(*)')
    .eq('id', submissionId)
    .single()

  if (subErr || !submission) {
    return jsonResponse({ error: 'submission not found' }, 404)
  }
  const assignment = submission.assignments
  if (!assignment) {
    return jsonResponse({ error: 'assignment not found for submission' }, 404)
  }

  // Already handled (e.g. a retried client invoke) — don't re-grade or
  // double-count against the daily AI rate limit.
  if (submission.evaluation_status === 'complete' || submission.evaluation_status === 'processing') {
    return jsonResponse({ ok: true, skipped: submission.evaluation_status })
  }

  await supabase.from('submissions').update({ evaluation_status: 'processing' }).eq('id', submissionId)

  try {
    if (assignment.assignment_type === 'quiz') {
      await gradeQuizSubmission(supabase, submission, assignment)
    } else {
      await gradeWithAI(supabase, submission, assignment)
    }
    return jsonResponse({ ok: true })
  } catch (e) {
    console.error('evaluate-submission failed', e)
    await markFailed(supabase, submissionId, e instanceof Error ? e.message : String(e))
    return jsonResponse({ ok: false, error: String(e) }, 200) // 200: the failure is recorded, not a transport error
  }
})

async function markFailed(supabase: ReturnType<typeof createClient>, submissionId: string, message: string) {
  await supabase
    .from('submissions')
    .update({ evaluation_status: 'failed', ai_error: message })
    .eq('id', submissionId)
  await supabase.from('submission_events').insert({
    submission_id: submissionId,
    action: 'ai_failed',
    note: message,
  })
}

// deno-lint-ignore no-explicit-any
async function gradeQuizSubmission(supabase: any, submission: any, assignment: any) {
  const [{ data: answers, error: answersErr }, { data: questions, error: questionsErr }] = await Promise.all([
    supabase.from('quiz_answers').select('question_id, selected_option_id').eq('submission_id', submission.id),
    supabase.from('quiz_questions').select('id').eq('assignment_id', assignment.id),
  ])
  if (answersErr) throw answersErr
  if (questionsErr) throw questionsErr

  const questionIds: string[] = (questions ?? []).map((q: { id: string }) => q.id)
  const { data: options, error: optionsErr } = questionIds.length
    ? await supabase.from('quiz_options').select('id, question_id, is_correct').in('question_id', questionIds)
    : { data: [], error: null }
  if (optionsErr) throw optionsErr

  const passThreshold = (assignment.config?.pass_threshold as number) ?? 70
  const result = gradeQuiz(answers ?? [], options ?? [], questionIds, passThreshold)
  const suggestedStatus = result.passed ? 'passed' : 'needs_work'

  const { error: updateErr } = await supabase
    .from('submissions')
    .update({
      quiz_score: result.score,
      ai_suggested_status: suggestedStatus,
      final_status: suggestedStatus,
      evaluation_status: 'complete',
      ai_model: 'rule-based-grading',
      ai_feedback: quizFeedback(result),
    })
    .eq('id', submission.id)
  if (updateErr) throw updateErr

  await supabase.from('submission_events').insert({
    submission_id: submission.id,
    action: 'ai_evaluated',
    to_status: suggestedStatus,
    note: `Rule-based quiz grading: ${result.correctCount}/${result.total} (${result.score}%)`,
  })
}

// deno-lint-ignore no-explicit-any
async function gradeWithAI(supabase: any, submission: any, assignment: any) {
  const startOfDayUtc = new Date()
  startOfDayUtc.setUTCHours(0, 0, 0, 0)

  const { count, error: countErr } = await supabase
    .from('submissions')
    .select('id, assignments!inner(assignment_type)', { count: 'exact', head: true })
    .eq('user_id', submission.user_id)
    .neq('assignments.assignment_type', 'quiz')
    .gte('submitted_at', startOfDayUtc.toISOString())
  if (countErr) throw countErr

  if ((count ?? 0) > MAX_AI_EVALS_PER_DAY) {
    throw new Error(`Daily AI evaluation limit reached (${MAX_AI_EVALS_PER_DAY}/day). A mentor will review this.`)
  }

  const { system, user } = buildGradingPrompt({
    assignmentType: assignment.assignment_type,
    instructions: assignment.instructions,
    rubric: assignment.rubric,
    content: submission.content ?? '',
  })

  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
    try {
      const verdict = parseGradeVerdict(await callGemini(system, user))

      const { error: updateErr } = await supabase
        .from('submissions')
        .update({
          ai_feedback: verdict.feedback,
          ai_suggested_status: verdict.status,
          final_status: verdict.status,
          evaluation_status: 'complete',
          ai_model: GEMINI_MODEL,
        })
        .eq('id', submission.id)
      if (updateErr) throw updateErr

      await supabase.from('submission_events').insert({
        submission_id: submission.id,
        action: 'ai_evaluated',
        to_status: verdict.status,
        note: `AI evaluation (attempt ${attempt}/${MAX_AI_ATTEMPTS})`,
      })
      return
    } catch (e) {
      lastError = e
      console.error(`AI grading attempt ${attempt} failed`, e)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function callGemini(system: string, userMessage: string): Promise<GeminiGenerateContentResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      tools: [
        {
          function_declarations: [
            {
              name: 'submit_grade',
              description: 'Submit the grading verdict and feedback for this assignment submission.',
              parameters: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['passed', 'needs_work'],
                    description: 'Whether the submission meets the rubric well enough to pass.',
                  },
                  feedback: {
                    type: 'string',
                    description: 'Constructive, specific markdown feedback for the student (2-5 sentences).',
                  },
                },
                required: ['status', 'feedback'],
              },
            },
          ],
        },
      ],
      tool_config: {
        function_calling_config: { mode: 'ANY', allowed_function_names: ['submit_grade'] },
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as GeminiGenerateContentResponse
}
