import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'

interface Stats {
  students: number
  mentors: number
  weeksPublished: number
  weeksDraft: number
  brokenLinks: number
}

function useAdminStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [students, mentors, weeksPublished, weeksDraft, brokenLinks] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mentor'),
        supabase.from('weeks').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('weeks').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('is_broken', true),
      ])
      setStats({
        students: students.count ?? 0,
        mentors: mentors.count ?? 0,
        weeksPublished: weeksPublished.count ?? 0,
        weeksDraft: weeksDraft.count ?? 0,
        brokenLinks: brokenLinks.count ?? 0,
      })
    })()
  }, [])

  return stats
}

function StatusCard({
  label,
  value,
  to,
  dot,
}: {
  label: string
  value: number
  to: string
  dot: 'pass' | 'warn' | 'fail'
}) {
  const dotColor = dot === 'pass' ? 'bg-pass' : dot === 'warn' ? 'bg-warn' : 'bg-fail'
  return (
    <Link to={to} className="card block no-underline hover:shadow-app">
      <p className="font-display text-[44px] font-bold leading-none text-ink">{value}</p>
      <div className="mt-3.5 flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <span className="meta">{label}</span>
      </div>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const stats = useAdminStats()

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ system overview ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Admin overview</h1>

        {stats && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/admin/students"
                className="flex min-h-[150px] flex-col justify-between rounded-card bg-ink p-7 no-underline hover:shadow-app"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-paper/70">
                    Students enrolled
                  </span>
                  <span className="shrink-0 rounded-full bg-lime px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                    Active
                  </span>
                </div>
                <p className="font-display text-[64px] font-bold leading-none text-paper">{stats.students}</p>
              </Link>

              <Link to="/admin/mentors" className="card flex min-h-[150px] flex-col justify-between no-underline hover:shadow-app">
                <span className="meta">Mentors</span>
                <p className="font-display text-[56px] font-bold leading-none text-ink">{stats.mentors}</p>
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatusCard label="Published weeks" value={stats.weeksPublished} to="/admin/curriculum" dot="pass" />
              <StatusCard label="Draft weeks" value={stats.weeksDraft} to="/admin/curriculum" dot="warn" />
              <StatusCard
                label="Broken links"
                value={stats.brokenLinks}
                to="/admin/broken-links"
                dot={stats.brokenLinks > 0 ? 'fail' : 'pass'}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
