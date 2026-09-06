import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-card border-2 border-ink ${className}`}>
      <table className="w-full min-w-[560px] border-collapse text-left">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-stone">{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-hairline">{children}</tbody>
}

export function TR({ children, className = '', ...rest }: HTMLAttributes<HTMLTableRowElement> & { children: ReactNode }) {
  return (
    <tr className={`odd:bg-surface even:bg-paper ${className}`} {...rest}>
      {children}
    </tr>
  )
}

export function TH({ children, className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th className={`px-4 py-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted ${className}`} {...rest}>
      {children}
    </th>
  )
}

export function TD({ children, className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    <td className={`px-4 py-3.5 align-middle text-[14.5px] ${className}`} {...rest}>
      {children}
    </td>
  )
}
