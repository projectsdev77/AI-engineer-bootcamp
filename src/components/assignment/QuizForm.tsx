import { useState } from 'react'
import type { QuizQuestionWithOptions } from '@/hooks/useAssignmentDetail'

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
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(answers)
      }}
      className="space-y-6"
    >
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-lg border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-medium text-slate-900">
            {i + 1}. {q.prompt}
          </legend>
          <div className="mt-3 space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.id}
                  disabled={disabled}
                  checked={answers[q.id] === opt.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                {opt.text}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={disabled || !allAnswered}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit answers
      </button>
    </form>
  )
}
