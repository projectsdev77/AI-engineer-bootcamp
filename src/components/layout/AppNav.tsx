import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Monogram } from '@/components/ui/icons'
import Avatar from '@/components/ui/Avatar'

export default function AppNav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  // Navigate to the landing page ourselves rather than letting
  // ProtectedRoute's own redirect fire: that redirect attaches the current
  // page as `state.from` so the next login returns here — useful when a
  // session expires mid-browse, but wrong for an explicit "log out", which
  // should always land the next login on the dashboard, not wherever the
  // user happened to click log out from.
  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="border-b-2 border-ink bg-ink text-paper">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-3 no-underline">
          <Monogram size={32} />
          <span className="hidden font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-paper sm:inline">
            Become an AI Engineer
          </span>
          {profile?.role === 'mentor' && (
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper"
              style={{ background: '#3B3B4C' }}
            >
              Mentor
            </span>
          )}
          {profile?.role === 'admin' && (
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper"
              style={{ background: '#3B3B4C' }}
            >
              Admin
            </span>
          )}
        </Link>
        <div className="flex items-center gap-5">
          {profile?.role === 'mentor' && (
            <Link to="/mentor" className="font-mono text-xs text-paper no-underline hover:text-lime">
              your students
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link to="/admin" className="font-mono text-xs text-paper no-underline hover:text-lime">
              admin
            </Link>
          )}
          <Link to="/settings" className="flex items-center gap-2 no-underline hover:text-lime">
            <Avatar name={profile?.full_name} size={26} />
            <span className="hidden font-mono text-xs text-paper/80 sm:inline">
              {profile?.full_name?.toLowerCase() ?? 'settings'}
            </span>
          </Link>
          <button
            onClick={() => void handleLogout()}
            className="rounded-field border-2 border-paper/40 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-paper hover:border-paper"
          >
            log out
          </button>
        </div>
      </nav>
    </header>
  )
}
