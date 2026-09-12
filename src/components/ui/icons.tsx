/* Custom filled glyphs, 24px grid, currentColor. No icon font, no stroke library. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 16.6 4.9 12l1.7-1.7 2.9 2.9 7.9-7.9L19.1 7l-9.6 9.6Z" />
    </Base>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2Zm3 5.5a1.5 1.5 0 0 1 1 2.62V19h-2v-.88a1.5 1.5 0 0 1 1-2.62Z" />
    </Base>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10.6 3.9a1.6 1.6 0 0 1 2.8 0l8.5 14.7a1.6 1.6 0 0 1-1.4 2.4H3.5a1.6 1.6 0 0 1-1.4-2.4l8.5-14.7ZM11 9v5h2V9h-2Zm0 7v2h2v-2h-2Z" />
    </Base>
  )
}

export function MessageIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4.4 3.3A1 1 0 0 1 3 19.5V5a1 1 0 0 1 1-1Zm2.5 4.5v2h11v-2h-11Zm0 4v2h7v-2h-7Z" />
    </Base>
  )
}

export function AssignmentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 2h12a1 1 0 0 1 1 1v18.2a.8.8 0 0 1-1.24.67L12 18.6l-5.76 3.27A.8.8 0 0 1 5 21.2V3a1 1 0 0 1 1-1Zm2 5.5v2h8v-2H8Zm0 4v2h8v-2H8Z" />
    </Base>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2.5l2.7 6.3 6.8.6-5.2 4.5 1.6 6.6L12 17l-5.9 3.5 1.6-6.6-5.2-4.5 6.8-.6L12 2.5Z" />
    </Base>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 5.5h2v2H4v-2Zm4 .25h12v1.5H8v-1.5ZM4 11h2v2H4v-2Zm4 .25h12v1.5H8v-1.5ZM4 16.5h2v2H4v-2Zm4 .25h12v1.5H8v-1.5Z" />
    </Base>
  )
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 8.4 5.4 15l1.5 1.5L12 11.4l5.1 5.1L18.6 15 12 8.4Z" />
    </Base>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 15.6 18.6 9l-1.5-1.5L12 12.6 6.9 7.5 5.4 9l6.6 6.6Z" />
    </Base>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 5.4 15.6 12 9 18.6 7.5 17.1l4.5-4.5-4.5-4.5L9 5.4Z" />
    </Base>
  )
}

/** The wordmark monogram: "AI" in ink on a lime rounded chip. Minimum 26px. Never recolour. */
export function Monogram({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-lime font-display font-bold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42, lineHeight: 1 }}
    >
      AI
    </span>
  )
}
