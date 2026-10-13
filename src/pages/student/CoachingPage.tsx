import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Cal, { getCalApi } from '@calcom/embed-react'
import { supabase } from '@/lib/supabase'
import { calPath } from '@/lib/calLink'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import Avatar from '@/components/ui/Avatar'
import Callout from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { LockIcon } from '@/components/ui/icons'
import type { CoachingMentor } from '@/types/database'

function useCoachingMentors(enabled: boolean) {
  const [mentors, setMentors] = useState<CoachingMentor[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    supabase.rpc('list_coaching_mentors').then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message)
      else setMentors((data ?? []) as CoachingMentor[])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [enabled])

  return { mentors, loading, error }
}

function MentorCard({ mentor, onSelect }: { mentor: CoachingMentor; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card flex w-full flex-col items-start gap-4 text-left transition-shadow hover:shadow-app focus-visible:shadow-app"
    >
      <Avatar name={mentor.full_name} src={mentor.avatar_url} size={64} />
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-ink">{mentor.full_name ?? 'Mentor'}</p>
        {mentor.title && <p className="mt-0.5 text-[14px] text-muted">{mentor.title}</p>}
      </div>
      <span className="mt-auto font-mono text-[11.5px] font-bold uppercase tracking-wide text-blue-700">
        See availability →
      </span>
    </button>
  )
}

function BookingEmbed({ mentor, onBooked }: { mentor: CoachingMentor; onBooked: () => void }) {
  const { user, profile } = useAuth()

  useEffect(() => {
    let cancelled = false
    let detach: (() => void) | undefined
    void getCalApi().then((cal) => {
      if (cancelled) return
      cal('ui', { theme: 'light', styles: { branding: { brandColor: '#14141E' } }, hideEventTypeDetails: false })
      // Cal.com's confirmation screen has no way back into the app, so we
      // surface our own next step once the booking (or a reschedule) lands.
      const callback = () => onBooked()
      cal('on', { action: 'bookingSuccessfulV2', callback })
      cal('on', { action: 'rescheduleBookingSuccessfulV2', callback })
      detach = () => {
        cal('off', { action: 'bookingSuccessfulV2', callback })
        cal('off', { action: 'rescheduleBookingSuccessfulV2', callback })
      }
    })
    return () => {
      cancelled = true
      detach?.()
    }
  }, [onBooked])

  return (
    <Cal
      // Remount per mentor so switching mentors never shows the previous
      // mentor's calendar while the new one loads.
      key={mentor.id}
      calLink={calPath(mentor.cal_link)}
      config={{ name: profile?.full_name ?? '', email: user?.email ?? '', layout: 'month_view' }}
      style={{ width: '100%', minHeight: 640, overflow: 'auto' }}
    />
  )
}

export default function CoachingPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const isPaid = profile?.payment_status === 'paid'
  const { mentors, loading, error } = useCoachingMentors(isPaid)

  // Kept in the URL so the browser back button returns to the mentor list,
  // and a refresh doesn't lose the selection.
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = mentors.find((m) => m.id === searchParams.get('mentor')) ?? null

  // Which mentor the student just booked, so "Done" only appears on that
  // mentor's page — switching mentors starts a fresh booking.
  const [bookedWith, setBookedWith] = useState<string | null>(null)
  const selectedId = selected?.id ?? null
  const markBooked = useCallback(() => setBookedWith(selectedId), [selectedId])
  const booked = selected != null && bookedWith === selected.id

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ 1-on-1 coaching ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Book a coaching session</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
          Pick a mentor to see their availability, then choose a Career &amp; Tech Coaching session or Mock Interview
          Practice. You'll get a confirmation email with the Google Meet link.
        </p>
        {isPaid && (
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Booked sessions appear in your email and calendar. To reschedule or cancel, use the links in your
            confirmation email.
          </p>
        )}

        {!isPaid ? (
          <Callout tone="info" heading="Included with full access" icon={<LockIcon className="h-3.5 w-3.5" />} className="mt-8 max-w-2xl">
            1-on-1 coaching with mentors is part of the full program. Contact us to complete your enrollment and
            unlock it.
          </Callout>
        ) : loading ? (
          <p className="mt-10 font-mono text-xs font-bold uppercase tracking-wide text-muted">loading mentors…</p>
        ) : error ? (
          <p className="mt-10 text-sm font-bold text-fail-ink">Couldn't load mentors: {error}</p>
        ) : selected ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={selected.full_name} src={selected.avatar_url} size={48} />
                <div>
                  <p className="font-display text-xl font-bold text-ink">{selected.full_name ?? 'Mentor'}</p>
                  {selected.title && <p className="text-[14px] text-muted">{selected.title}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSearchParams({})}>
                  ← Choose another mentor
                </Button>
                {booked && (
                  <Button type="button" variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
                    Done
                  </Button>
                )}
              </div>
            </div>
            {booked && (
              <Callout tone="pass" className="mt-6">
                You're booked with {selected.full_name ?? 'your mentor'}. The confirmation email has the Google Meet
                link and options to reschedule or cancel.
              </Callout>
            )}
            <div className="mt-6 overflow-hidden rounded-panel border-2 border-ink bg-surface">
              <BookingEmbed mentor={selected} onBooked={markBooked} />
            </div>
          </section>
        ) : mentors.length === 0 ? (
          <p className="mt-10 max-w-2xl text-[15px] text-muted">
            No mentors are taking bookings right now. Check back soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} onSelect={() => setSearchParams({ mentor: mentor.id })} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
