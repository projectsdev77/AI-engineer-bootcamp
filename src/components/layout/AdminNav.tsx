import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/curriculum', label: 'Curriculum' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/broken-links', label: 'Broken links' },
  { to: '/admin/certificate', label: 'Certificate' },
  { to: '/admin/queue', label: 'Exception queue' },
] as const

export default function AdminNav() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={'end' in tab ? tab.end : false}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
                isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
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
