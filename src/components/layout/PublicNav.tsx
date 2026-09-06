import { Link } from 'react-router-dom'

export default function PublicNav() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="text-base font-semibold text-slate-900">
          Become an AI Engineer
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/curriculum" className="text-sm text-slate-600 hover:text-slate-900">
            Curriculum
          </Link>
          <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
