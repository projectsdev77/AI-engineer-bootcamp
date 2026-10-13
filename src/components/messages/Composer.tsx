import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  formatBytes,
  validateAttachment,
} from '@/lib/messageAttachments'

/** Wraps the selection (or inserts a placeholder) in a ``` code fence. */
function insertCodeFence(el: HTMLTextAreaElement, value: string): { value: string; cursor: number } {
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = value.slice(start, end)
  const before = value.slice(0, start)
  const lead = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
  const inner = selected || 'paste your code here'
  const block = `${lead}\`\`\`\n${inner}\n\`\`\`\n`
  return { value: before + block + value.slice(end), cursor: before.length + lead.length + 4 + inner.length }
}

export function AttachmentPicker({
  files,
  onChange,
  onError,
  disabled,
}: {
  files: File[]
  onChange: (files: File[]) => void
  onError: (msg: string | null) => void
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)

  function add(list: FileList | null) {
    if (!list) return
    const next = [...files]
    for (const f of Array.from(list)) {
      const problem = validateAttachment(f)
      if (problem) {
        onError(problem)
        continue
      }
      if (next.length >= MAX_ATTACHMENTS) {
        onError(`Up to ${MAX_ATTACHMENTS} files per message.`)
        break
      }
      next.push(f)
    }
    onChange(next)
    if (input.current) input.current.value = ''
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => add(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="font-mono text-[11.5px] font-bold uppercase tracking-wide text-blue-700 hover:underline disabled:opacity-50"
      >
        + attach file
      </button>
    </>
  )
}

export function FileChips({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="flex max-w-full items-center gap-2 rounded-full border-2 border-ink bg-paper px-3 py-1 text-[12.5px]"
        >
          <span className="truncate">{f.name}</span>
          <span className="shrink-0 font-mono text-[10.5px] text-muted">{formatBytes(f.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="shrink-0 font-bold text-muted hover:text-ink"
            aria-label={`Remove ${f.name}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Message input: text, a code-block button, and attachments. Ctrl/⌘+Enter sends. */
export default function Composer({ onSend }: { onSend: (body: string, files: File[]) => Promise<boolean> }) {
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  const canSend = !sending && (draft.trim().length > 0 || files.length > 0)

  async function submit() {
    if (!canSend) return
    setSending(true)
    const ok = await onSend(draft, files)
    setSending(false)
    if (ok) {
      setDraft('')
      setFiles([])
      setFileError(null)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="space-y-2.5 border-t-2 border-ink bg-surface p-3"
    >
      <textarea
        ref={textarea}
        id="message_draft"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={3}
        placeholder="Write a reply…"
        aria-label="Message"
        className="field min-h-[84px] w-full resize-y"
      />
      <FileChips files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
      {fileError && <p className="text-[13px] font-bold text-fail-ink">{fileError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              const el = textarea.current
              if (!el) return
              const { value, cursor } = insertCodeFence(el, draft)
              setDraft(value)
              requestAnimationFrame(() => {
                el.focus()
                el.setSelectionRange(cursor, cursor)
              })
            }}
            aria-label="Insert code block"
            title="Insert code block"
            className="font-mono text-[11.5px] font-bold uppercase tracking-wide text-blue-700 hover:underline"
          >
            {'</>'} code
          </button>
          <AttachmentPicker files={files} onChange={setFiles} onError={setFileError} disabled={sending} />
        </div>
        <Button type="submit" variant="primary" size="sm" disabled={!canSend}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  )
}
