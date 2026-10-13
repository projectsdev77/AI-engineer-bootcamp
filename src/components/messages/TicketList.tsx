import { Link } from 'react-router-dom'
import StatusPill from '@/components/ui/StatusPill'
import type { TicketSummary } from '@/types/database'

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function TicketStatusPill({ ticket }: { ticket: TicketSummary }) {
  if (ticket.status === 'closed') return <StatusPill variant="pass">closed</StatusPill>
  if (!ticket.claimed_by) return <StatusPill variant="warn">waiting</StatusPill>
  return <StatusPill variant="progress">open</StatusPill>
}

/**
 * Inbox rows. `perspective` decides the secondary line: students see who
 * is handling it; mentors and admins see who asked.
 */
export default function TicketList({
  tickets,
  basePath,
  perspective,
  empty,
  showClaimer = false,
}: {
  tickets: TicketSummary[]
  basePath: string
  perspective: 'student' | 'staff'
  empty: string
  /** Staff lists only: also say which mentor has each question (admin views). */
  showClaimer?: boolean
}) {
  if (tickets.length === 0) {
    return <p className="rounded-panel border-2 border-dashed border-hairline p-8 text-center text-[14.5px] text-muted">{empty}</p>
  }

  return (
    <ul className="overflow-hidden rounded-panel border-2 border-ink bg-surface">
      {tickets.map((t) => {
        const who =
          perspective === 'student'
            ? t.status === 'open' && !t.claimed_by
              ? 'Waiting for a mentor'
              : `with ${t.claimed_by_name ?? 'a mentor'}`
            : (t.student_name ?? 'Student') + (showClaimer && t.claimed_by ? ` · ${t.claimed_by_name ?? 'a mentor'}` : '')
        return (
          <li key={t.id} className="border-b border-hairline last:border-b-0">
            <Link
              to={`${basePath}/${t.id}`}
              className="flex items-start gap-4 px-4 py-4 text-ink no-underline hover:bg-paper sm:px-5"
            >
              <span
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.unread_count > 0 ? 'bg-blue-500' : 'bg-transparent'}`}
                aria-label={t.unread_count > 0 ? `${t.unread_count} unread` : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`min-w-0 truncate text-[15.5px] ${t.unread_count > 0 ? 'font-bold' : 'font-semibold'}`}>
                    {t.subject}
                  </p>
                  {perspective === 'staff' && t.is_my_student && (
                    <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
                      your student
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate font-mono text-[11.5px] uppercase tracking-wide text-muted">{t.context_label}</p>
                <p className="mt-1 truncate text-[13.5px] text-muted">{who}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <TicketStatusPill ticket={t} />
                <span className="font-mono text-[11px] text-faint">{timeAgo(t.last_message_at)}</span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count: number }[]
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border-2 border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide ${
            value === o.value ? 'bg-ink text-paper' : 'bg-surface text-ink'
          }`}
        >
          {o.label} ({o.count})
        </button>
      ))}
    </div>
  )
}
