import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useMessageThread } from '@/hooks/useMessageThread'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

export default function MessageThread({ studentId }: { studentId: string }) {
  const { user } = useAuth()
  const { messages, loading, sending, error, send } = useMessageThread(studentId)
  const [draft, setDraft] = useState('')

  return (
    <div className="overflow-hidden rounded-panel border-2 border-ink bg-surface">
      <div className="max-h-96 space-y-3 overflow-y-auto p-4">
        {loading && <p className="font-mono text-xs font-bold uppercase text-muted">loading…</p>}
        {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
        {!loading && messages.length === 0 && (
          <p className="text-[14.5px] text-muted">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-card border-2 border-ink px-3.5 py-2.5 text-[14.5px] ${
                  mine ? 'bg-ink text-paper' : 'bg-paper text-ink'
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 font-mono text-[10px] ${mine ? 'text-paper/50' : 'text-faint'}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          void send(draft)
          setDraft('')
        }}
        className="flex gap-2 border-t-2 border-ink p-3"
      >
        <Field value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="flex-1" />
        <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
