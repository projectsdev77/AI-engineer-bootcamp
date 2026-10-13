import { useState } from 'react'

function initial(name: string | null | undefined): string {
  const first = name?.trim()[0]
  return first ? first.toUpperCase() : '?'
}

export default function Avatar({
  name,
  src,
  size = 32,
  className = '',
}: {
  name: string | null | undefined
  src?: string | null
  size?: number
  className?: string
}) {
  // A pasted photo URL can 404 or be hotlink-blocked later; fall back to the
  // initial rather than showing a broken-image icon. Tracked per URL so a
  // corrected URL (e.g. while typing in Settings) gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
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
      {initial(name)}
    </span>
  )
}
