import { useState } from 'react'
import AppNav from '@/components/layout/AppNav'
import { LinkButton } from '@/components/ui/Button'
import TicketList, { Tabs } from '@/components/messages/TicketList'
import { useTickets } from '@/hooks/useTickets'

/** Student inbox: one row per question, open ones first by default. */
export default function MyQuestionsPage() {
  const { tickets, loading, error } = useTickets()
  const [tab, setTab] = useState<'open' | 'closed'>('open')

  const open = tickets.filter((t) => t.status === 'open')
  const closed = tickets.filter((t) => t.status === 'closed')

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ your questions ]</p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Questions</h1>
            <p className="mt-1 max-w-xl text-[15px] text-muted">
              Ask a mentor about anything in the program. Each question gets its own thread, and the first available
              mentor picks it up.
            </p>
          </div>
          <LinkButton to="/questions/new" variant="primary">
            New question
          </LinkButton>
        </div>

        <div className="mt-8">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'open', label: 'Open', count: open.length },
              { value: 'closed', label: 'Closed', count: closed.length },
            ]}
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">loading…</p>
          ) : error ? (
            <p className="text-sm font-bold text-fail-ink">Couldn't load your questions: {error}</p>
          ) : (
            <TicketList
              tickets={tab === 'open' ? open : closed}
              basePath="/questions"
              perspective="student"
              empty={
                tab === 'open'
                  ? 'No open questions. Stuck on something? Start a new question.'
                  : 'No closed questions yet.'
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}
