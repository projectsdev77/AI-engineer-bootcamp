function initial(name: string | null | undefined): string {
  const first = name?.trim()[0]
  return first ? first.toUpperCase() : '?'
}

export default function Avatar({
  name,
  size = 32,
  className = '',
}: {
  name: string | null | undefined
  size?: number
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-blue-50 font-display font-bold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial(name)}
    </span>
  )
}
