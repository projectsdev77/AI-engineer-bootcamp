import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { Monogram } from '@/components/ui/icons'
import Avatar from '@/components/ui/Avatar'

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fail px-1 font-mono text-[10px] font-bold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function AppNav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { unread, unclaimed } = useUnreadMessages()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the phone menu whenever a link in it is followed.
  useEffect(() => setMenuOpen(false), [location.pathname])

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

  const links: { to: string; label: string; badge?: number }[] =
    profile?.role === 'student'
      ? [
          { to: '/dashboard/portfolio', label: 'portfolio' },
          { to: '/dashboard/coaching', label: 'coaching' },
          { to: '/messages', label: 'messages', badge: unread },
        ]
      : profile?.role === 'mentor'
        ? [
            { to: '/mentor', label: 'your students' },
            { to: '/questions', label: 'questions', badge: unread + unclaimed },
          ]
        : profile?.role === 'admin'
          ? [
              { to: '/questions', label: 'questions', badge: unread + unclaimed },
              { to: '/admin', label: 'admin' },
            ]
          : []
  const badgeTotal = links.reduce((sum, l) => sum + (l.badge ?? 0), 0)

  return (
    <header className="border-b-2 border-ink bg-ink text-paper">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
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
        {/* Inline links from md up; below that they move into the menu panel. */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden items-center gap-5 md:flex">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-1.5 font-mono text-xs text-paper no-underline hover:text-lime">
                {l.label}
                {l.badge !== undefined && <UnreadBadge count={l.badge} />}
              </Link>
            ))}
          </div>
          <Link to="/settings" className="flex items-center gap-2 no-underline hover:text-lime">
            <Avatar name={profile?.full_name} src={profile?.avatar_url} size={26} />
            <span className="hidden font-mono text-xs text-paper/80 sm:inline">
              {profile?.full_name?.toLowerCase() ?? 'settings'}
            </span>
          </Link>
          <button
            onClick={() => void handleLogout()}
            className="hidden shrink-0 rounded-field border-2 border-paper/40 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-paper hover:border-paper md:block"
          >
            log out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="app-nav-menu"
            className="flex shrink-0 items-center gap-1.5 rounded-field border-2 border-paper/40 px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-paper hover:border-paper md:hidden"
          >
            {menuOpen ? 'close' : 'menu'}
            {!menuOpen && <UnreadBadge count={badgeTotal} />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div id="app-nav-menu" className="border-t border-paper/15 px-4 pb-4 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="flex items-center justify-between border-b border-paper/10 py-3 font-mono text-sm text-paper no-underline hover:text-lime"
                >
                  {l.label}
                  {l.badge !== undefined && <UnreadBadge count={l.badge} />}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/settings" className="block border-b border-paper/10 py-3 font-mono text-sm text-paper no-underline hover:text-lime">
                settings
              </Link>
            </li>
          </ul>
          <button
            onClick={() => void handleLogout()}
            className="mt-4 w-full rounded-field border-2 border-paper/40 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-paper hover:border-paper"
          >
            log out
          </button>
        </div>
      )}
    </header>
  )
}
