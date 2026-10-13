/** "github.com/owner/repo" from a repo URL, for compact display. */
export function repoLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

/** A project submission's repo + demo links and notes. */
export default function ProjectLinks({
  repoUrl,
  demoUrl,
  notes,
}: {
  repoUrl: string | null
  demoUrl: string | null
  notes: string | null
}) {
  return (
    <div className="space-y-2.5">
      <dl className="grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[110px_1fr]">
        <dt className="meta pt-0.5 text-faint">Repository</dt>
        <dd className="min-w-0 truncate">
          {repoUrl ? (
            <a href={repoUrl} target="_blank" rel="noreferrer noopener" className="font-semibold">
              {repoLabel(repoUrl)} ↗
            </a>
          ) : (
            <span className="text-muted">none</span>
          )}
        </dd>
        <dt className="meta pt-0.5 text-faint">Live demo</dt>
        <dd className="min-w-0 truncate">
          {demoUrl ? (
            <a href={demoUrl} target="_blank" rel="noreferrer noopener" className="font-semibold">
              {repoLabel(demoUrl)} ↗
            </a>
          ) : (
            <span className="text-muted">none</span>
          )}
        </dd>
      </dl>
      {notes && <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{notes}</p>}
    </div>
  )
}
