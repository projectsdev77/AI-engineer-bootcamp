function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export default function Avatar({
  name,
  url,
  size = 32,
  className = '',
}: {
  name: string | null | undefined
  url?: string | null
  size?: number
  className?: string
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full border-2 border-ink object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-blue-50 font-display font-bold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  )
}
