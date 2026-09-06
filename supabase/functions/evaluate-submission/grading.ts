// Pure, Deno/Node-agnostic grading logic, kept separate from index.ts so it
// can be unit-tested with plain Node (no Deno runtime needed) — this
// environment has no Deno available to exercise the edge function directly.

export interface QuizAnswer {
  question_id: string
  selected_option_id: string
}

export interface QuizOption {
  id: string
  question_id: string
  is_correct: boolean
}

export interface QuizGradeResult {
  score: number // percent, 0-100, two decimal places
  correctCount: number
  total: number
  passed: boolean
}

/** Deterministic, server-side quiz grading (section 5.3/7: is_correct never reaches the client). */
export function gradeQuiz(
  answers: QuizAnswer[],
  options: QuizOption[],
  questionIds: string[],
  passThreshold: number,
): QuizGradeResult {
  const correctOptionByQuestion = new Map<string, string>()
  for (const o of options) {
    if (o.is_correct) correctOptionByQuestion.set(o.question_id, o.id)
  }

  let correctCount = 0
  for (const a of answers) {
    if (correctOptionByQuestion.get(a.question_id) === a.selected_option_id) correctCount++
  }

  const total = questionIds.length
  const score = total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0
  return { score, correctCount, total, passed: score >= passThreshold }
}

export function quizFeedback(result: QuizGradeResult): string {
  return result.passed
    ? `You scored ${result.score}% (${result.correctCount}/${result.total} correct). Nice work!`
    : `You scored ${result.score}% (${result.correctCount}/${result.total} correct). Review the material and try again — attempts are unlimited.`
}

export interface AnthropicContentBlock {
  type: string
  name?: string
  input?: unknown
  [key: string]: unknown
}
export interface AnthropicMessageResponse {
  content: AnthropicContentBlock[]
}

export interface GradeVerdict {
  status: 'passed' | 'needs_work'
  feedback: string
}

/** Extracts and validates the structured grading verdict from a Messages API response. */
export function parseGradeVerdict(response: AnthropicMessageResponse): GradeVerdict {
  const toolUse = response.content?.find(
    (block) => block.type === 'tool_use' && block.name === 'submit_grade',
  )
  if (!toolUse) {
    throw new Error('No submit_grade tool_use block in Anthropic response')
  }
  const input = toolUse.input as Record<string, unknown>
  const status = input?.status
  const feedback = input?.feedback
  if (status !== 'passed' && status !== 'needs_work') {
    throw new Error(`Invalid status from model: ${JSON.stringify(status)}`)
  }
  if (typeof feedback !== 'string' || feedback.trim().length === 0) {
    throw new Error('Missing or empty feedback from model')
  }
  return { status, feedback }
}

export function buildGradingPrompt(params: {
  assignmentType: 'text' | 'url'
  instructions: string
  rubric: string | null
  content: string
}): { system: string; user: string } {
  const system = `You are grading a student assignment for a self-paced AI engineering bootcamp. Be constructive, specific, and honest — this feedback is shown directly to the student. Base your verdict on the rubric, not on how much effort the submission looks like it took.

Assignment instructions:
${params.instructions}

Rubric:
${params.rubric ?? 'Use your judgment based on the instructions above.'}`

  const user =
    params.assignmentType === 'url'
      ? `The student submitted this URL as their work: ${params.content}

You cannot browse the link. Evaluate plausibility and completeness against the rubric based on the URL itself and the assignment instructions (e.g. does it look like the right kind of host/repo for what was asked). If you genuinely cannot assess it from the URL alone, lean toward "needs_work" and say exactly what the student should double-check or link instead.`
      : `Student's submission:

${params.content}`

  return { system, user }
}
