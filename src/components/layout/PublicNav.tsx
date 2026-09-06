import { Link } from 'react-router-dom'
import { Monogram } from '@/components/ui/icons'

export default function PublicNav() {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <Monogram size={34} />
          <span className="font-mono text-[13px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">
            Become an
            <br />
            AI Engineer
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/curriculum" className="hidden font-mono text-xs lowercase text-ink no-underline hover:text-blue-700 sm:inline">
            curriculum
          </Link>
          <Link to="/login" className="font-mono text-xs lowercase text-ink no-underline hover:text-blue-700">
            log in
          </Link>
          <Link
            to="/signup"
            className="btn btn-primary text-ink"
            style={{ minHeight: 40, padding: '10px 20px', fontSize: 13.5 }}
          >
            get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
