import type { ReactNode } from 'react'

export type CalloutTone = 'info' | 'pass' | 'warn' | 'fail'

export default function Callout({
  tone,
  heading,
  icon,
  children,
  className = '',
}: {
  tone: CalloutTone
  heading?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`callout callout-${tone} ${className}`}>
      {heading && (
        <p className="meta mb-1.5 flex items-center gap-1.5 text-current">
          {icon}
          {heading}
        </p>
      )}
      <div className="text-[14.5px] leading-relaxed">{children}</div>
    </div>
  )
}
