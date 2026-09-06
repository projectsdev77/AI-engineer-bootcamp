import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="border-b-2 border-hairline bg-paper px-4 py-3.5 sm:px-6">
      <ol className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 font-mono text-xs lowercase">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-faint">/</span>}
            {item.to ? (
              <Link to={item.to} className="text-blue-700 no-underline hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-bold text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
