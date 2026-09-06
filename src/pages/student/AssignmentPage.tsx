import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import AppNav from '@/components/layout/AppNav'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import {
  quizConfig,
  textConfig,
  urlConfig,
  useAssignmentDetail,
} from '@/hooks/useAssignmentDetail'
import QuizForm from '@/components/assignment/QuizForm'
import TextForm from '@/components/assignment/TextForm'
import UrlForm from '@/components/assignment/UrlForm'
import SubmissionResult from '@/components/assignment/SubmissionResult'

export default function AssignmentPage() {
  const { assignmentId, weekId } = useParams()
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

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to={`/weeks/${weekId}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to week
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {assignment && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{assignment.title}</h1>
            <div className="prose prose-slate prose-sm mt-4 max-w-none">
              <ReactMarkdown>{assignment.instructions}</ReactMarkdown>
            </div>

            {assignment.assignment_type === 'text' && (
              <p className="mt-2 text-xs text-slate-400">
                {textConfig(assignment).min_words}–{textConfig(assignment).max_words} words
              </p>
            )}
            {assignment.assignment_type === 'url' && urlConfig(assignment).allowed_hosts?.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Accepted hosts: {urlConfig(assignment).allowed_hosts.join(', ')}
              </p>
            )}
            {assignment.assignment_type === 'quiz' && (
              <p className="mt-2 text-xs text-slate-400">
                Pass threshold: {quizConfig(assignment).pass_threshold}%
              </p>
            )}

            <div className="mt-8">
              {rateLimited && (
                <p className="mb-3 text-xs text-amber-600">
                  You can submit again in {secondsUntilNextAttempt}s.
                </p>
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

            {submissions.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {submissions.length > 1 ? 'Attempts' : 'Your submission'}
                </h2>
                <div className="mt-3 space-y-3">
                  {submissions.map((s) => (
                    <SubmissionResult
                      key={s.id}
                      submission={s}
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
