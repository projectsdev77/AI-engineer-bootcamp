import { useState } from 'react'
import type { TextConfig } from '@/types/database'

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length
}

export default function TextForm({
  config,
  disabled,
  onSubmit,
}: {
  config: TextConfig
  disabled: boolean
  onSubmit: (content: string) => void
}) {
  const [content, setContent] = useState('')
  const words = wordCount(content)
  const tooShort = words < config.min_words
  const tooLong = words > config.max_words

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(content)
      }}
      className="space-y-3"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={disabled}
        rows={12}
        placeholder="Write your answer here…"
        className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={tooShort || tooLong ? 'text-amber-600' : 'text-slate-400'}>
          {words} words (min {config.min_words}, max {config.max_words})
        </span>
      </div>
      <button
        type="submit"
        disabled={disabled || tooShort || tooLong || words === 0}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  )
}
