export default function ProgressBar({
  percent,
  tone = 'lime',
  className = '',
}: {
  percent: number
  tone?: 'lime' | 'ink'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${tone === 'lime' ? 'bg-lime' : 'bg-ink'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
