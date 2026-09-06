import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import {
  quizConfig,
  textConfig,
  urlConfig,
  useAssignmentDetail,
} from '@/hooks/useAssignmentDetail'
import { useWeekDetail } from '@/hooks/useWeekDetail'
import QuizForm from '@/components/assignment/QuizForm'
import TextForm from '@/components/assignment/TextForm'
import UrlForm from '@/components/assignment/UrlForm'
import SubmissionResult from '@/components/assignment/SubmissionResult'

const TYPE_LABEL: Record<string, string> = { quiz: 'Quiz', text: 'Text', url: 'URL' }

export default function AssignmentPage() {
  const { assignmentId, weekId } = useParams()
  const { week } = useWeekDetail(weekId)
  const {
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
  } = useAssignmentDetail(assignmentId)

  if (loading) return <FullPageSpinner />

  const rateLimited = secondsUntilNextAttempt > 0
  const formDisabled = submitting || rateLimited
  const alreadyPassed = latest?.final_status === 'passed'

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      {week && assignment && (
        <Breadcrumb
          items={[
            { label: 'dashboard', to: '/dashboard' },
            { label: `week ${week.position}`, to: `/weeks/${week.id}` },
            { label: assignment.title.toLowerCase() },
          ]}
        />
      )}

      <main className="mx-auto max-w-[760px] px-4 py-10 sm:px-6">
        {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}

        {assignment && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill" style={{ background: 'var(--color-ink)', borderColor: 'var(--color-ink)', color: 'var(--color-lime)' }}>
                {TYPE_LABEL[assignment.assignment_type] ?? assignment.assignment_type}
              </span>
              {assignment.assignment_type === 'text' && (
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                  {textConfig(assignment).min_words}–{textConfig(assignment).max_words} words
                </span>
              )}
              {assignment.assignment_type === 'url' && urlConfig(assignment).allowed_hosts?.length > 0 && (
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                  accepted: {urlConfig(assignment).allowed_hosts.join(', ')}
                </span>
              )}
              {assignment.assignment_type === 'quiz' && (
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                  pass threshold {quizConfig(assignment).pass_threshold}% · attempt {submissions.length + 1}
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">{assignment.title}</h1>
            <div className="prose prose-sm mt-4 max-w-none text-ink">
              <ReactMarkdown>{assignment.instructions}</ReactMarkdown>
            </div>

            {!alreadyPassed && (
              <div className="mt-8">
                {rateLimited && (
                  <Callout tone="warn" icon={<AlertIcon className="h-3.5 w-3.5" />} className="mb-4">
                    You can submit again in {secondsUntilNextAttempt}s.
                  </Callout>
                )}

                {assignment.assignment_type === 'quiz' && (
                  <QuizForm questions={questions} disabled={formDisabled} onSubmit={submitQuiz} />
                )}
                {assignment.assignment_type === 'text' && (
                  <TextForm config={textConfig(assignment)} disabled={formDisabled} onSubmit={submitText} />
                )}
                {assignment.assignment_type === 'url' && (
                  <UrlForm config={urlConfig(assignment)} disabled={formDisabled} onSubmit={submitText} />
                )}
              </div>
            )}

            {submissions.length > 0 && (
              <section className="mt-10">
                <p className="meta">{submissions.length > 1 ? 'Attempts' : 'Your submission'}</p>
                <div className="mt-3 space-y-4">
                  {submissions.map((s) => (
                    <SubmissionResult
                      key={s.id}
                      submission={s}
                      isLatest={s.id === latest?.id}
                      continueHref={week ? '/dashboard' : undefined}
                      onFlag={(reason) => {
                        if (s.id === latest?.id) void flagForReview(reason)
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
