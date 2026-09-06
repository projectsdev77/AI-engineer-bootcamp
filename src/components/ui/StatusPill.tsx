import type { ReactNode } from 'react'
import { CheckIcon, AlertIcon, LockIcon } from './icons'

export type StatusVariant = 'pass' | 'progress' | 'warn' | 'fail' | 'locked' | 'draft'

const config: Record<StatusVariant, { cls: string; icon?: ReactNode }> = {
  pass: { cls: 'pill-pass', icon: <CheckIcon className="h-3 w-3" /> },
  progress: { cls: 'pill-progress' },
  warn: { cls: 'pill-warn', icon: <AlertIcon className="h-3 w-3" /> },
  fail: { cls: 'pill-fail', icon: <AlertIcon className="h-3 w-3" /> },
  locked: { cls: 'pill-locked', icon: <LockIcon className="h-3 w-3" /> },
  draft: { cls: 'pill-locked' },
}

export default function StatusPill({
  variant,
  children,
  className = '',
}: {
  variant: StatusVariant
  children: ReactNode
  className?: string
}) {
  const { cls, icon } = config[variant]
  return (
    <span className={`pill ${cls} ${className}`}>
      {icon}
      {children}
    </span>
  )
}
