import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AppNav from '@/components/layout/AppNav'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusPill, { type StatusVariant } from '@/components/ui/StatusPill'
import { AnchorButton, Button } from '@/components/ui/Button'
import { LockIcon } from '@/components/ui/icons'
import { repoLabel } from '@/components/assignment/ProjectLinks'
import type { PortfolioItem, PortfolioState } from '@/types/database'

function usePortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void supabase.rpc('get_portfolio').then(({ data, error }) => {
      if (error) setError(error.message)
      else setItems((data ?? []) as PortfolioItem[])
      setLoading(false)
    })
  }, [])
  return { items, loading, error }
}

const STATE: Record<PortfolioState, { label: string; variant: StatusVariant }> = {
  completed: { label: 'completed', variant: 'pass' },
  in_review: { label: 'in review', variant: 'progress' },
  needs_work: { label: 'needs work', variant: 'warn' },
  not_started: { label: 'not started', variant: 'locked' },
  locked: { label: 'locked', variant: 'locked' },
}

/** GitHub's social preview for a public repo — a real visual of the project, no API key needed. */
function githubPreview(repoUrl: string | null) {
  const m = repoUrl?.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/i)
  return m ? `https://opengraph.githubassets.com/1/${m[1]}/${m[2]}` : null
}

function Cover({ item, large = false }: { item: PortfolioItem; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  const preview = item.state === 'completed' ? githubPreview(item.repo_url) : null

  if (preview && !failed) {
    return (
      <img
        src={preview}
        alt={`Preview of ${item.repo_url ? repoLabel(item.repo_url) : item.title}`}
        onError={() => setFailed(true)}
        className="aspect-[2/1] w-full border-b-2 border-ink bg-stone object-cover"
        loading="lazy"
      />
    )
  }

  const done = item.state === 'completed'
  return (
    <div
      className={`flex aspect-[2/1] w-full flex-col justify-between border-b-2 p-4 ${
        done ? 'border-ink bg-lime' : 'border-disabled bg-stone'
      }`}
    >
      <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${done ? 'text-ink' : 'text-faint'}`}>
        {done ? `Week ${item.week_position}` : STATE[item.state].label}
      </span>
      <span
        className={`flex items-end justify-between gap-3 font-display font-bold leading-tight tracking-[-0.02em] ${
          large ? 'text-3xl' : 'text-2xl'
        } ${done ? 'text-ink' : 'text-faint'}`}
      >
        {/* Completed without a preview image: the repo name. Pending: the week number, so the grid reads as a timeline. */}
        <span className={done ? 'line-clamp-2' : 'text-5xl tabular-nums'}>
          {done && item.repo_url ? repoLabel(item.repo_url).split('/').pop() : String(item.week_position).padStart(2, '0')}
        </span>
        {item.state === 'locked' && <LockIcon className="h-6 w-6 shrink-0" />}
      </span>
    </div>
  )
}

function Skills({ skills, muted }: { skills: string[]; muted: boolean }) {
  if (!skills?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <li
          key={s}
          className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${
            muted ? 'border-disabled text-faint' : 'border-ink/30 text-ink'
          }`}
        >
          {s}
        </li>
      ))}
    </ul>
  )
}

function ProjectCard({ item, onOpen }: { item: PortfolioItem; onOpen: () => void }) {
  const done = item.state === 'completed'
  const state = STATE[item.state]
  const assignmentHref = `/weeks/${item.week_id}/assignments/${item.assignment_id}`

  const body = (
    <>
      <Cover item={item} />
      <div className="flex flex-1 flex-col p-4">
        <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.08em] ${done ? 'text-muted' : 'text-faint'}`}>
          Week {item.week_position} · {item.week_title}
        </p>
        <p className={`mt-1 font-display text-lg font-bold leading-snug ${done ? 'text-ink' : 'text-muted'}`}>{item.title}</p>
        <Skills skills={item.week_skills} muted={!done} />
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <StatusPill variant={state.variant}>{state.label}</StatusPill>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-blue-700">
            {done ? 'View project →' : item.state === 'not_started' ? 'Start →' : item.state === 'needs_work' ? 'See feedback →' : item.state === 'in_review' ? 'View →' : ''}
          </span>
        </div>
      </div>
    </>
  )

  const base = 'flex h-full w-full flex-col overflow-hidden rounded-panel border-2 text-left no-underline'
  if (done) {
    return (
      <button type="button" onClick={onOpen} className={`${base} border-ink bg-surface transition-shadow hover:shadow-app focus-visible:shadow-app`}>
        {body}
      </button>
    )
  }
  if (item.state === 'locked') {
    return (
      <div className={`${base} border-disabled bg-paper opacity-80 grayscale`} aria-label={`${item.title}, locked`}>
        {body}
      </div>
    )
  }
  return (
    <Link to={assignmentHref} className={`${base} border-disabled bg-paper grayscale-[60%] hover:border-ink hover:grayscale-0`}>
      {body}
    </Link>
  )
}

function ProjectDialog({ item, onClose }: { item: PortfolioItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (item && !el.open) el.showModal()
    if (!item && el.open) el.close()
  }, [item])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-panel border-2 border-ink bg-surface p-0 text-ink shadow-app backdrop:bg-ink/60"
    >
      {item && (
        <div>
          <Cover item={item} large />
          <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              Week {item.week_position} · {item.week_title}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{item.title}</h2>
            {item.completed_at && (
              <p className="mt-1 text-[13px] text-muted">Completed {new Date(item.completed_at).toLocaleDateString()}</p>
            )}
            <Skills skills={item.week_skills} muted={false} />

            <div className="mt-5 flex flex-wrap gap-3">
              {item.repo_url && (
                <AnchorButton href={item.repo_url} target="_blank" rel="noreferrer noopener" variant="primary" size="sm">
                  GitHub repository ↗
                </AnchorButton>
              )}
              {item.demo_url && (
                <AnchorButton href={item.demo_url} target="_blank" rel="noreferrer noopener" variant="secondary" size="sm">
                  Live demo ↗
                </AnchorButton>
              )}
            </div>
            <dl className="mt-4 space-y-1 font-mono text-[12px] text-muted">
              {item.repo_url && <dd className="truncate">{repoLabel(item.repo_url)}</dd>}
              {item.demo_url && <dd className="truncate">{repoLabel(item.demo_url)}</dd>}
            </dl>

            {item.notes && (
              <div className="mt-5 border-t-2 border-hairline pt-4">
                <p className="meta text-faint">About this project</p>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{item.notes}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}

/** Every project in the curriculum: greyed out until passed, full color once it is. */
export default function PortfolioPage() {
  const { items, loading, error } = usePortfolio()
  const [open, setOpen] = useState<PortfolioItem | null>(null)
  const completed = items.filter((i) => i.state === 'completed').length

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ portfolio ]</p>
            <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Your projects</h1>
            <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-muted">
              All the projects you'll build in the program. A project turns full color once it passes review. Click a
              completed project to see your repo, live demo and description.
            </p>
          </div>
          {items.length > 0 && (
            <div className="rounded-panel border-2 border-ink bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="meta">Completed</span>
                <span className="font-display text-2xl font-bold text-ink">
                  {completed}
                  <span className="text-base text-muted"> / {items.length}</span>
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar percent={Math.round((completed / items.length) * 100)} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10">
          {loading ? (
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">loading…</p>
          ) : error ? (
            <p className="text-sm font-bold text-fail-ink">Couldn't load your portfolio: {error}</p>
          ) : items.length === 0 ? (
            <p className="rounded-panel border-2 border-dashed border-hairline p-8 text-center text-[15px] text-muted">
              No projects in the curriculum yet. They'll appear here as they're added.
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.assignment_id}>
                  <ProjectCard item={item} onOpen={() => setOpen(item)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <ProjectDialog item={open} onClose={() => setOpen(null)} />
    </div>
  )
}
