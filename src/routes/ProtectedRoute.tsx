import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    </div>
  )
}

/** Requires a signed-in user; otherwise redirects to /login, preserving the attempted path. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
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
