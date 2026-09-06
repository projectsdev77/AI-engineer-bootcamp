import type { HTMLAttributes, ReactNode } from 'react'

export default function Card({
  active,
  locked,
  className = '',
  children,
  ...rest
}: {
  active?: boolean
  locked?: boolean
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${locked ? 'card-locked' : ''} ${active ? 'card-active' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}
