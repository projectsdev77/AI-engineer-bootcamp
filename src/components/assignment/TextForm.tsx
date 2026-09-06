import { useState } from 'react'
import type { TextConfig } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'

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
      <div className="relative">
        <TextAreaField
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={disabled}
          rows={12}
          placeholder="Write your answer here…"
          style={{ minHeight: 240 }}
          error={tooLong}
        />
        <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] font-bold text-faint">
          {words} words
        </span>
      </div>
      <p className={`font-mono text-[11px] font-bold uppercase tracking-wide ${tooShort || tooLong ? 'text-warn-ink' : 'text-faint'}`}>
        min {config.min_words} · max {config.max_words}
      </p>
      <Button type="submit" variant="primary" disabled={disabled || tooShort || tooLong || words === 0} className="w-full">
        Submit
      </Button>
    </form>
  )
}
