import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function AppNav() {
  const { profile, signOut } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/dashboard" className="text-base font-semibold text-slate-900">
          Become an AI Engineer
        </Link>
        <div className="flex items-center gap-5">
          {profile?.role === 'mentor' && (
            <Link to="/mentor" className="text-sm text-slate-600 hover:text-slate-900">
              Mentor
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link to="/admin/queue" className="text-sm text-slate-600 hover:text-slate-900">
              Admin
            </Link>
          )}
          <span className="text-sm text-slate-500">{profile?.full_name}</span>
          <button onClick={() => void signOut()} className="text-sm text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      </nav>
    </header>
  )
}
