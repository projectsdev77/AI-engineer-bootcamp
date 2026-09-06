import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin', label: 'overview', end: true },
  { to: '/admin/curriculum', label: 'curriculum' },
  { to: '/admin/students', label: 'students' },
  { to: '/admin/broken-links', label: 'broken links' },
  { to: '/admin/certificate', label: 'certificate' },
  { to: '/admin/queue', label: 'exception queue' },
] as const

export default function AdminNav() {
  return (
    <div style={{ background: 'var(--color-ink-soft)' }}>
      <nav className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={'end' in tab ? tab.end : false}
            className={({ isActive }) =>
              `whitespace-nowrap px-4 py-3 font-mono text-xs font-bold lowercase tracking-[0.04em] no-underline ${
                isActive ? 'bg-lime text-ink' : 'text-paper/70 hover:text-paper'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
