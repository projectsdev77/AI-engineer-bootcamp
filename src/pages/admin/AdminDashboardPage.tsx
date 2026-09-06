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

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const stats = useAdminStats()

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin overview</h1>
        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Students" value={stats.students} to="/admin/students" />
            <StatCard label="Mentors" value={stats.mentors} to="/admin/students" />
            <StatCard label="Published weeks" value={stats.weeksPublished} to="/admin/curriculum" />
            <StatCard label="Broken links" value={stats.brokenLinks} to="/admin/broken-links" />
            <StatCard label="Open exceptions" value={stats.openExceptions} to="/admin/queue" />
          </div>
        )}
      </main>
    </div>
  )
}
