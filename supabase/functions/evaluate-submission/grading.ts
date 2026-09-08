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

export interface GeminiFunctionCall {
  name: string
  args?: Record<string, unknown>
}
export interface GeminiPart {
  functionCall?: GeminiFunctionCall
  [key: string]: unknown
}
export interface GeminiGenerateContentResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
}

export interface GradeVerdict {
  status: 'passed' | 'needs_work'
  feedback: string
}

/** Extracts and validates the structured grading verdict from a generateContent response. */
export function parseGradeVerdict(response: GeminiGenerateContentResponse): GradeVerdict {
  if (response.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request: ${response.promptFeedback.blockReason}`)
  }
  const call = response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall?.name === 'submit_grade')
    ?.functionCall
  if (!call) {
    throw new Error('No submit_grade function call in Gemini response')
  }
  const status = call.args?.status
  const feedback = call.args?.feedback
  if (status !== 'passed' && status !== 'needs_work') {
    throw new Error(`Invalid status from model: ${JSON.stringify(status)}`)
  }
  if (typeof feedback !== 'string' || feedback.trim().length === 0) {
    throw new Error('Missing or empty feedback from model')
  }
  return { status, feedback }
}

/** Result of trying to fetch a submitted URL's real content server-side, before grading it. */
export type UrlFetchResult =
  | { ok: true; text: string; sourceLabel: string; finalUrl?: string }
  | { ok: false; error: string }

export function buildGradingPrompt(params: {
  assignmentType: 'text' | 'url'
  instructions: string
  rubric: string | null
  content: string
  urlFetch?: UrlFetchResult
}): { system: string; user: string } {
  const system = `You are grading a student assignment for a self-paced AI engineering bootcamp. Be constructive, specific, and honest — this feedback is shown directly to the student. Base your verdict on the rubric, not on how much effort the submission looks like it took.

Assignment instructions:
${params.instructions}

Rubric:
${params.rubric ?? 'Use your judgment based on the instructions above.'}`

  let user: string
  if (params.assignmentType === 'text') {
    user = `Student's submission:

${params.content}`
  } else if (params.urlFetch?.ok) {
    const redirectNote =
      params.urlFetch.finalUrl && params.urlFetch.finalUrl !== params.content
        ? ` (redirected to ${params.urlFetch.finalUrl})`
        : ''
    user = `The student submitted this URL as their work: ${params.content}${redirectNote}

Retrieved content (${params.urlFetch.sourceLabel}), fetched just now:

"""
${params.urlFetch.text}
"""

Evaluate this actual retrieved content against the rubric and instructions above — do not just judge the URL string. If the content looks unrelated to the assignment or clearly insufficient, say so specifically.`
  } else if (params.urlFetch && !params.urlFetch.ok) {
    user = `The student submitted this URL as their work: ${params.content}

The URL could not be verified just now: ${params.urlFetch.error}. This usually means the link is broken, private, requires login, or the site is briefly down. Since the actual content can't be confirmed, lean toward "needs_work" unless the assignment instructions explicitly don't require a live, public link — and tell the student exactly what to check (e.g. "make sure the repository is public" or "confirm the link loads without signing in").`
  } else {
    // No fetch was attempted — fall back to plausibility-only grading rather
    // than fail the whole submission over it.
    user = `The student submitted this URL as their work: ${params.content}

You cannot browse the link. Evaluate plausibility and completeness against the rubric based on the URL itself and the assignment instructions. If you genuinely cannot assess it from the URL alone, lean toward "needs_work" and say exactly what the student should double-check or link instead.`
  }

  return { system, user }
}

// ---------------------------------------------------------------------------
// URL-content helpers (pure — no network here; index.ts does the fetching and
// hands the raw bytes/errors to these to turn into prompt-ready text).
// ---------------------------------------------------------------------------

/** Strips scripts/styles/tags from raw HTML down to plain, whitespace-collapsed text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncateForPrompt(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n\n[...truncated]`
}

/** Parses a GitHub repo URL into {owner, repo}, or null if it isn't one. */
export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, '') }
}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local — includes cloud metadata endpoints (e.g. 169.254.169.254)
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
]

/**
 * Basic SSRF guard for server-side-fetching a student-submitted URL: only
 * http(s) to what looks like a public hostname. This is a literal/hostname
 * check, not DNS-pinned — it doesn't stop a hostname that *resolves* to a
 * private address at fetch time (DNS rebinding), which would need a custom
 * resolver to fully close. Good enough against the obvious/naive case
 * (submitting `http://localhost/...` or a raw private IP) without adding a
 * custom DNS layer for a bootcamp-scale grading tool.
 */
export function isSafeUrlToFetch(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
  return !PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(hostname))
}
