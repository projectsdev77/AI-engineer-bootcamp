import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

interface CheckboxProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, disabled, label, className = '' }: CheckboxProps) {
  return (
    <label
      className={`inline-flex min-h-11 items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
    >
      <span
        className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink"
        style={checked ? { background: 'var(--color-lime)' } : { background: 'var(--color-surface)' }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        {checked && <CheckIcon className="h-4 w-4 text-ink" />}
      </span>
      {label != null && <span>{label}</span>}
    </label>
  )
}

interface RadioProps {
  checked: boolean
  onChange?: () => void
  disabled?: boolean
  name?: string
  label?: ReactNode
  className?: string
}

export function Radio({ checked, onChange, disabled, name, label, className = '' }: RadioProps) {
  return (
    <label
      className={`inline-flex min-h-11 items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface">
        <input
          type="radio"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={() => onChange?.()}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0 disabled:cursor-not-allowed"
        />
        {checked && <span className="h-3 w-3 rounded-full bg-ink" />}
      </span>
      {label != null && <span>{label}</span>}
    </label>
  )
}
