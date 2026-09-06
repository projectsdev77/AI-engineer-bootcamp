import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'

export function Label({ children, className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label className={`label mb-1.5 block text-ink ${className}`} {...rest}>
      {children}
    </label>
  )
}

export function Field({ error, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={`field ${error ? 'field-error' : ''} ${className}`} {...rest} />
}

export function TextAreaField({
  error,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea className={`field ${error ? 'field-error' : ''} ${className}`} {...rest} />
}

export function SelectField({ error, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select className={`field ${error ? 'field-error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-warn-ink">{children}</p>
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[13px] text-muted">{children}</p>
}
