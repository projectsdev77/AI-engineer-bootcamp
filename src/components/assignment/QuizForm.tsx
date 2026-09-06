import { useState } from 'react'
import type { QuizQuestionWithOptions } from '@/hooks/useAssignmentDetail'
import { Button } from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

export default function QuizForm({
  questions,
  disabled,
  onSubmit,
}: {
  questions: QuizQuestionWithOptions[]
  disabled: boolean
  onSubmit: (answers: Record<string, string>) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const answeredCount = questions.filter((q) => answers[q.id]).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(answers)
      }}
      className="space-y-6"
    >
      <div className="card flex items-center gap-4">
        <span className="meta shrink-0">Answered</span>
        <ProgressBar percent={questions.length ? (answeredCount / questions.length) * 100 : 0} />
        <span className="shrink-0 font-mono text-sm font-bold text-ink">
          {answeredCount} / {questions.length}
        </span>
      </div>

      {questions.map((q, i) => {
        const answered = Boolean(answers[q.id])
        return (
          <fieldset key={q.id} className={`card ${answered ? '' : 'opacity-100'}`}>
            <legend className="flex items-start gap-3 px-1 pb-1">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink bg-lime font-mono text-xs font-bold text-ink">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-bold text-ink">{q.prompt}</span>
            </legend>
            <div className="mt-3 space-y-2.5 pl-10">
              {q.options.map((opt) => {
                const checked = answers[q.id] === opt.id
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-field border-2 border-ink px-4 py-3 text-[15px] ${
                      checked ? 'bg-lime font-bold text-ink' : 'bg-surface text-ink hover:bg-stone'
                    } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.id}
                        disabled={disabled}
                        checked={checked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                        className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                      />
                      {checked && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                    </span>
                    {opt.text}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      <div className="flex items-center justify-between rounded-panel border-2 border-ink bg-ink px-6 py-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-paper/60">
          answer all {questions.length} to submit · no time limit
        </p>
        <Button type="submit" variant="primary" disabled={disabled || !allAnswered}>
          Submit answers
        </Button>
      </div>
    </form>
  )
}
