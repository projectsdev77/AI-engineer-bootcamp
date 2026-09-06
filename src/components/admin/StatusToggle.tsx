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
      className={`pill shrink-0 ${isPublished ? 'pill-pass' : 'pill-locked'}`}
    >
      {isPublished ? 'published' : 'draft'}
    </button>
  )
}
