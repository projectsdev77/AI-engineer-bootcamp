import { useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import MessageBody from '@/components/messages/MessageBody'
import Avatar from '@/components/ui/Avatar'
import { formatBytes, isImage } from '@/lib/messageAttachments'
import type { Message, TicketSummary } from '@/types/database'

function Attachments({ message, urls, mine }: { message: Message; urls: Map<string, string>; mine: boolean }) {
  if (!message.attachments?.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      {message.attachments.map((a) => {
        const url = urls.get(a.path)
        if (isImage(a) && url) {
          return (
            <a key={a.path} href={url} target="_blank" rel="noreferrer" className="block">
              <img
                src={url}
                alt={a.name}
                className="max-h-56 max-w-full rounded-field border-2 border-ink object-contain"
              />
            </a>
          )
        }
        return (
          <a
            key={a.path}
            href={url}
            target="_blank"
            rel="noreferrer"
            download={a.name}
            className={`flex max-w-full items-center gap-2 rounded-full border-2 px-3 py-1 text-[12.5px] no-underline ${
              mine ? 'border-paper/40 text-paper hover:border-paper' : 'border-ink text-ink hover:bg-stone'
            } ${url ? '' : 'pointer-events-none opacity-60'}`}
          >
            <span className="truncate">{a.name}</span>
            <span className={`shrink-0 font-mono text-[10.5px] ${mine ? 'text-paper/60' : 'text-muted'}`}>
              {formatBytes(a.size)}
            </span>
          </a>
        )
      })}
    </div>
  )
}

/** The back-and-forth of one ticket, in the existing chat-bubble style. `footer` is the composer or a closed notice. */
export default function TicketThread({
  ticket,
  messages,
  attachmentUrls,
  footer,
}: {
  ticket: TicketSummary
  messages: Message[]
  attachmentUrls: Map<string, string>
  footer: ReactNode
}) {
  const { user } = useAuth()
  const pane = useRef<HTMLDivElement>(null)

  // Open at (and follow) the latest message without scrolling the page.
  useEffect(() => {
    if (pane.current) pane.current.scrollTop = pane.current.scrollHeight
  }, [messages.length])

  function senderLabel(m: Message) {
    if (m.sender_id === ticket.student_id) return ticket.student_name ?? 'Student'
    if (m.sender_id && m.sender_id === ticket.claimed_by) return ticket.claimed_by_name ?? 'Mentor'
    return m.sender_id ? 'Mentor' : 'Former mentor'
  }
  function senderAvatar(m: Message) {
    if (m.sender_id === ticket.student_id) return ticket.student_avatar_url
    if (m.sender_id && m.sender_id === ticket.claimed_by) return ticket.claimed_by_avatar_url
    return null
  }

  return (
    <div className="overflow-hidden rounded-panel border-2 border-ink bg-surface">
      <div ref={pane} className="max-h-[60vh] min-h-[240px] space-y-4 overflow-y-auto bg-paper/40 p-4">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <Avatar name={senderLabel(m)} src={senderAvatar(m)} size={28} />}
              <div
                className={`min-w-0 max-w-[85%] rounded-card border-2 border-ink px-3.5 py-2.5 sm:max-w-[75%] ${
                  mine ? 'bg-ink text-paper' : 'bg-surface text-ink'
                }`}
              >
                {!mine && <p className="mb-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-muted">{senderLabel(m)}</p>}
                {m.body && <MessageBody body={m.body} inverted={mine} />}
                <Attachments message={m} urls={attachmentUrls} mine={mine} />
                <p className={`mt-1.5 font-mono text-[10px] ${mine ? 'text-paper/50' : 'text-faint'}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {footer}
    </div>
  )
}
