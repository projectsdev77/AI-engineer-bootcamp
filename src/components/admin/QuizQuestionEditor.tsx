import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReorderButtons from '@/components/admin/ReorderButtons'
import { Field, TextAreaField } from '@/components/ui/Field'
import { useAdminCollection } from '@/hooks/useAdminCollection'
import type { QuizOption, QuizQuestion } from '@/types/database'

export default function QuizQuestionEditor({
  question,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
}: {
  question: QuizQuestion
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (fields: Partial<QuizQuestion>) => void
  onDelete: () => void
}) {
  const [prompt, setPrompt] = useState(question.prompt)
  const options = useAdminCollection<QuizOption>('quiz_options', 'question_id', question.id)

  useEffect(() => setPrompt(question.prompt), [question.prompt])

  async function setCorrect(optionId: string) {
    // Only one correct option per question: clear the others first.
    await Promise.all(
      options.items.filter((o) => o.id !== optionId).map((o) => supabase.from('quiz_options').update({ is_correct: false }).eq('id', o.id)),
    )
    await options.update(optionId, { is_correct: true })
  }

  async function addOption() {
    await options.create({ text: 'New option', is_correct: false })
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <ReorderButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <TextAreaField
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => onUpdate({ prompt })}
          rows={2}
          className="flex-1"
        />
        <button onClick={onDelete} className="font-mono text-[11px] font-bold uppercase text-fail-ink hover:underline">
          del
        </button>
      </div>

      <div className="mt-3 space-y-2 pl-10">
        {options.items.map((opt) => (
          <div key={opt.id} className="flex items-center gap-3">
            <span
              className="relative inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-ink"
              style={opt.is_correct ? { background: 'var(--color-lime)' } : { background: 'var(--color-surface)' }}
              title="Mark as the correct answer"
            >
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={opt.is_correct}
                onChange={() => void setCorrect(opt.id)}
                className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
              />
              {opt.is_correct && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
            </span>
            <Field value={opt.text} onChange={(e) => void options.update(opt.id, { text: e.target.value })} className="flex-1" />
            <button onClick={() => void options.remove(opt.id)} className="font-mono text-xs font-bold text-fail-ink hover:underline">
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => void addOption()} className="font-mono text-[11px] font-bold uppercase text-blue-700 hover:underline">
          + add option
        </button>
      </div>
    </div>
  )
}
