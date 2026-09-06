import { useState } from 'react'
import type { UrlConfig } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Field, FieldError, FieldHint } from '@/components/ui/Field'

function hostMatches(url: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return true
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  } catch {
    return false
  }
}

export default function UrlForm({
  config,
  disabled,
  onSubmit,
}: {
  config: UrlConfig
  disabled: boolean
  onSubmit: (url: string) => void
}) {
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)

  let validUrl = false
  try {
    validUrl = Boolean(new URL(url))
  } catch {
    validUrl = false
  }
  const hostOk = validUrl && hostMatches(url, config.allowed_hosts)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(url)
      }}
      className="space-y-3"
    >
      <Field
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        placeholder="https://github.com/you/your-project"
        error={touched && validUrl && !hostOk}
      />
      {touched && validUrl && !hostOk && (
        <FieldError>Expected a link from: {config.allowed_hosts.join(', ')}</FieldError>
      )}
      {config.require_public && <FieldHint>Make sure this link is publicly accessible.</FieldHint>}
      <Button type="submit" variant="primary" disabled={disabled || !validUrl} className="w-full">
        Submit
      </Button>
    </form>
  )
}
