import PublicNav from '@/components/layout/PublicNav'
import { LinkButton } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="mx-auto max-w-[880px] px-4 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-xl overflow-hidden rounded-panel border-[3px] border-ink shadow-site" style={{ background: '#0B0C10' }}>
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-lime" />
            <span className="font-mono text-xs text-white/50">~/track</span>
          </div>
          <div className="space-y-2 p-6 text-left font-mono text-[13px] leading-relaxed text-white/90">
            <p className="text-lime">$ cd weeks/that-page-doesnt-exist</p>
            <p className="text-fail">bash: cd: no such file or directory</p>
            <p className="font-display text-[64px] font-bold leading-none text-white sm:text-[72px]">404</p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-md text-[17px] leading-relaxed text-muted">
          This page doesn't exist, or moved somewhere we haven't linked. Nothing you did broke anything.
        </p>
        <LinkButton to="/" variant="secondary" className="mt-8">
          Go home
        </LinkButton>
      </main>
    </div>
  )
}
