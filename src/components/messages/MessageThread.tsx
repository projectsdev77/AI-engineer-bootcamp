import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useMessageThread } from '@/hooks/useMessageThread'

export default function MessageThread({ studentId }: { studentId: string }) {
  const { user } = useAuth()
  const { messages, loading, sending, error, send } = useMessageThread(studentId)
  const [draft, setDraft] = useState('')

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="max-h-96 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-slate-400">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-brand-100' : 'text-slate-400'}`}>
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
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
