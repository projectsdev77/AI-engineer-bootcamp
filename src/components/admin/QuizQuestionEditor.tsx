import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReorderButtons from '@/components/admin/ReorderButtons'
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <ReorderButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => onUpdate({ prompt })}
          rows={2}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={onDelete} className="text-xs text-red-500 hover:underline">
          Delete
        </button>
      </div>

      <div className="mt-3 space-y-2 pl-8">
        {options.items.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={opt.is_correct}
              onChange={() => void setCorrect(opt.id)}
              title="Mark as the correct answer"
            />
            <input
              value={opt.text}
              onChange={(e) => void options.update(opt.id, { text: e.target.value })}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <button onClick={() => void options.remove(opt.id)} className="text-xs text-red-400 hover:underline">
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => void addOption()} className="text-xs text-brand-600 hover:underline">
          + Add option
        </button>
      </div>
    </div>
  )
}
