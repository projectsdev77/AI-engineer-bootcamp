import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'

interface Stats {
  students: number
  mentors: number
  weeksPublished: number
  brokenLinks: number
  openExceptions: number
}

function useAdminStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [students, mentors, weeksPublished, brokenLinks, openExceptions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mentor'),
        supabase.from('weeks').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('is_broken', true),
        supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .or('evaluation_status.eq.failed,flagged_for_review_at.not.is.null')
          .is('reviewed_at', null),
      ])
      setStats({
        students: students.count ?? 0,
        mentors: mentors.count ?? 0,
        weeksPublished: weeksPublished.count ?? 0,
        brokenLinks: brokenLinks.count ?? 0,
        openExceptions: openExceptions.count ?? 0,
      })
    })()
  }, [])

  return stats
}

function StatCard({ label, value, to, alert }: { label: string; value: number; to: string; alert?: boolean }) {
  return (
    <Link to={to} className="card block no-underline hover:shadow-app">
      <p className={`font-display text-[44px] font-bold leading-none ${alert && value > 0 ? 'text-fail-ink' : 'text-ink'}`}>
        {value}
      </p>
      <p className="meta mt-2">{label}</p>
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
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Students" value={stats.students} to="/admin/students" />
            <StatCard label="Mentors" value={stats.mentors} to="/admin/students" />
            <StatCard label="Published weeks" value={stats.weeksPublished} to="/admin/curriculum" />
            <StatCard label="Broken links" value={stats.brokenLinks} to="/admin/broken-links" alert />
            <StatCard label="Open exceptions" value={stats.openExceptions} to="/admin/queue" alert />
          </div>
        )}
      </main>
    </div>
  )
}
