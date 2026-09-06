import { useState } from 'react'
import type { UrlConfig } from '@/types/database'

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
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        placeholder="https://github.com/you/your-project"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {touched && validUrl && !hostOk && (
        <p className="text-xs text-amber-600">
          Expected a link from: {config.allowed_hosts.join(', ')}
        </p>
      )}
      {config.require_public && (
        <p className="text-xs text-slate-400">Make sure this link is publicly accessible.</p>
      )}
      <button
        type="submit"
        disabled={disabled || !validUrl}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  )
}
