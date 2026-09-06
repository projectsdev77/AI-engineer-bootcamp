import type { PublishStatus } from '@/types/database'

export default function StatusToggle({
  status,
  onChange,
}: {
  status: PublishStatus
  onChange: (next: PublishStatus) => void
}) {
  const isPublished = status === 'published'
  return (
    <button
      onClick={() => onChange(isPublished ? 'draft' : 'published')}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
        isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </button>
  )
}
