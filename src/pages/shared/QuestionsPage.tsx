import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import TicketList, { Tabs } from '@/components/messages/TicketList'
import { useTickets } from '@/hooks/useTickets'

type Tab = 'unclaimed' | 'mine' | 'claimed' | 'closed'

/**
 * Mentor/admin view of student questions. Unclaimed is the shared queue
 * (oldest first, so nothing waits forever); Mine is what the viewer is
 * handling. Admins also see questions other mentors are handling.
 */
export default function QuestionsPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { tickets, loading, error } = useTickets()
  const [tab, setTab] = useState<Tab>('unclaimed')

  const unclaimed = tickets
    .filter((t) => t.status === 'open' && !t.claimed_by)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const mine = tickets.filter((t) => t.status === 'open' && t.claimed_by === user?.id)
  const claimedByOthers = tickets.filter((t) => t.status === 'open' && t.claimed_by && t.claimed_by !== user?.id)
  const closed = tickets.filter((t) => t.status === 'closed')

  const lists: Record<Tab, typeof tickets> = { unclaimed, mine, claimed: claimedByOthers, closed }
  const empty: Record<Tab, string> = {
    unclaimed: 'The queue is empty. Every question has a mentor.',
    mine: 'Nothing on your plate. Claim a question from the queue to start helping.',
    claimed: 'No questions are being handled by other mentors right now.',
    closed: isAdmin ? 'No closed questions yet.' : "Questions you've resolved show up here.",
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ student questions ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Questions</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-muted">
          New questions land in the shared queue. Claim one to reply (the student sees your name) and resolve it once
          the issue is solved.
        </p>

        <div className="mt-8">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'unclaimed', label: 'Unclaimed', count: unclaimed.length },
              { value: 'mine', label: 'Mine', count: mine.length },
              ...(isAdmin ? [{ value: 'claimed' as Tab, label: 'Other mentors', count: claimedByOthers.length }] : []),
              { value: 'closed', label: 'Closed', count: closed.length },
            ]}
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">loading…</p>
          ) : error ? (
            <p className="text-sm font-bold text-fail-ink">Couldn't load questions: {error}</p>
          ) : (
            <TicketList
              tickets={lists[tab]}
              basePath="/questions"
              perspective="staff"
              empty={empty[tab]}
              showClaimer={isAdmin && (tab === 'claimed' || tab === 'closed')}
            />
          )}
        </div>
      </main>
    </div>
  )
}
