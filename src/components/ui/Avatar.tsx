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
  // initial rather than showing a broken-image icon.
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
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
