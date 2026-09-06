import { Link } from 'react-router-dom'
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes, ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'site' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className: string) {
  if (variant === 'danger') {
    return `inline-flex min-h-0 items-center gap-1.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.06em] text-fail-ink hover:underline disabled:cursor-not-allowed disabled:text-faint ${className}`
  }
  const variantCls: Record<Exclude<ButtonVariant, 'danger'>, string> = {
    primary: 'btn-primary text-ink',
    site: 'btn-site',
    secondary: 'btn-secondary text-ink',
    ghost: 'btn-ghost',
  }
  const sizeCls = size === 'sm' ? 'min-h-[38px] px-4 py-[10px] text-[13.5px]' : ''
  return `btn ${variantCls[variant]} ${sizeCls} ${className}`
}

interface OwnProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: OwnProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  )
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  to,
  ...rest
}: OwnProps & { to: string } & Omit<ComponentProps<typeof Link>, 'className' | 'children' | 'to'>) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}

export function AnchorButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: OwnProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </a>
  )
}
