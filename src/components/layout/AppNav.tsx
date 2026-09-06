import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Monogram } from '@/components/ui/icons'

export default function AppNav() {
  const { profile, signOut } = useAuth()

  return (
    <header className="border-b-2 border-ink bg-ink text-paper">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-3 no-underline">
          <Monogram />
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
          <Link to="/settings" className="hidden font-mono text-xs text-paper/80 no-underline hover:text-lime sm:inline">
            {profile?.full_name?.toLowerCase() ?? 'settings'}
          </Link>
          <button
            onClick={() => void signOut()}
            className="rounded-field border-2 border-paper/40 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-paper hover:border-paper"
          >
            log out
          </button>
        </div>
      </nav>
    </header>
  )
}
