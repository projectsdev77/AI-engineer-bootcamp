import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">loading…</p>
    </div>
  )
}

/** Requires a signed-in user; otherwise redirects to /login. Login always lands on /dashboard — it never resumes the attempted path. */
export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Requires the signed-in user's profile role to be one of `roles`; otherwise redirects home. */
export function RequireRole({ roles }: { roles: Array<'student' | 'mentor' | 'admin'> }) {
  const { profile, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!profile) return <FullPageSpinner />
  if (!roles.includes(profile.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
