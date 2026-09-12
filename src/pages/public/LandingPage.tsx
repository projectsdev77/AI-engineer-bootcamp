import { Link } from 'react-router-dom'
import PublicNav from '@/components/layout/PublicNav'
import { LinkButton } from '@/components/ui/Button'
import { CheckIcon } from '@/components/ui/icons'
import engineerCodingIll from '@/assets/illustrations/engineer-coding.png'
import humanReviewIll from '@/assets/illustrations/human-review.jpg'
import communityIll from '@/assets/illustrations/community.jpg'

const WHY_ROWS = [
  {
    title: 'Sequenced, not ',
    highlight: 'scattered',
    body: 'Twelve weeks build on each other. You unlock week two by finishing week one — no picking a random tutorial and hoping it is the right next step.',
  },
  {
    title: 'Feedback on real work',
    highlight: null,
    body: 'Every assignment gets a response: AI-generated feedback the moment you submit, with a human mentor one request away if you want a second look.',
  },
  {
    title: 'Accountability without a cohort',
    highlight: null,
    body: 'No start dates, no deadlines, no late penalties. Progress is yours to make — the platform just makes sure you always know what is next.',
  },
]

const AUDIENCE = [
  'You already write code and want a structured path into AI engineering specifically.',
  'You learn better with sequencing and checkpoints than with an open-ended pile of links.',
  'You want feedback on what you build, not just a certificate for watching videos.',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <main>
        {/* hero */}
        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
                [ 12 weeks · self-paced · no cohort ]
              </p>
              <h1 className="mt-4 font-display text-[52px] font-bold leading-[0.96] tracking-[-0.03em] text-ink sm:text-[64px] lg:text-[72px]">
                Become an{' '}
                <span className="inline-block rounded-[6px] bg-lime px-2">AI engineer</span>
              </h1>
              <p className="mt-6 max-w-lg text-[19px] leading-[1.55] text-muted">
                A self-paced, 12-week path for developers moving into AI engineering. Curated
                resources, original framing, real assignments, and feedback on every submission.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <LinkButton to="/signup" variant="site">
                  Start learning
                </LinkButton>
                <LinkButton to="/curriculum" variant="secondary">
                  View the curriculum
                </LinkButton>
              </div>
            </div>

            <div className="overflow-hidden rounded-panel border-[3px] border-ink shadow-site" style={{ background: '#0B0C10' }}>
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-lime" />
                <span className="font-mono text-xs text-white/50">~/track/week-01</span>
              </div>
              <div className="space-y-3 p-5 font-mono text-[13px] leading-relaxed text-white/90">
                <p className="text-lime">$ ls weeks/</p>
                <p className="text-white/70">
                  <span className="text-pass">✓</span> 01_foundations_of_llms_and_transformers
                </p>
                <p className="text-white/70">
                  <span className="text-lime">▸</span> 02_prompt_engineering_and_context_design
                </p>
                <p className="text-white/40">· 03_retrieval_augmented_generation</p>
                <p className="text-white/40">· 04_tool_use_and_function_calling</p>
                <p className="text-white/40">· … 8 more</p>
                <p className="pt-2 text-lime">$ cat progress.json</p>
                <p className="text-white/70">{'{ "unlocked": 2, "submitted": 3, "feedback": "instant" }'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* claim strip */}
        <section className="border-y-2 border-ink bg-ink">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
            {['No start dates', 'No deadlines', 'No late penalties', 'Feedback on every submission'].map((claim, i) => (
              <span
                key={claim}
                className={`font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${i === 0 ? 'text-lime' : 'text-paper/70'}`}
              >
                {claim}
              </span>
            ))}
          </div>
        </section>

        {/* why this, not another list of links */}
        <section className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 sm:py-24">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">
            [ why this instead of another list of links ]
          </p>
          <div className="mt-6 border-y-2 border-ink">
            {WHY_ROWS.map((row, i) => (
              <div
                key={row.body}
                className={`grid gap-x-6 gap-y-2 py-7 sm:grid-cols-[64px_1fr_1fr] sm:items-baseline ${i > 0 ? 'border-t-2 border-ink' : ''}`}
              >
                <span className="font-mono text-[13px] font-bold text-faint">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display text-2xl font-bold text-ink">
                  {row.title}
                  {row.highlight && <span className="inline-block rounded-[6px] bg-lime px-1.5">{row.highlight}</span>}
                </h3>
                <p className="max-w-md text-[14.5px] leading-relaxed text-muted sm:justify-self-end sm:text-right">{row.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* feature panels */}
        <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-panel border-2 border-ink bg-blush p-7">
              <div className="ill-frame aspect-[2.8/1] w-full">
                <img src={engineerCodingIll} alt="" className="ill-photo" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">Feedback the moment you submit</h3>
              <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink/70">
                Every assignment gets a written response against the same rubric a mentor would use — not a score, not a checkmark.
              </p>
              <Link to="/curriculum" className="mt-3 inline-block font-bold text-ink underline decoration-2 underline-offset-2">
                see an assignment →
              </Link>
            </div>
            <div className="rounded-panel border-2 border-ink bg-lime p-7">
              <div className="ill-frame aspect-[2.8/1] w-full">
                <img src={humanReviewIll} alt="" className="ill-photo" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">A human, whenever you want one</h3>
              <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink/70">
                Disagree with the AI, or just want a second read? Ask a mentor and a person picks it up from the queue.
              </p>
              <Link to="/curriculum" className="mt-3 inline-block font-bold text-ink underline decoration-2 underline-offset-2">
                how review works →
              </Link>
            </div>
          </div>
        </section>

        {/* is this for you */}
        <section className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 sm:pb-28">
          <h2 className="font-display text-4xl font-bold text-ink">Is this for you?</h2>
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ three honest tests ]</p>
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="ill-frame mx-auto aspect-[4/3] max-w-[640px] lg:mx-0">
              <img src={communityIll} alt="" className="ill-photo" />
            </div>
            <ul className="divide-y-2 divide-ink border-y-2 border-ink">
              {AUDIENCE.map((line) => (
                <li key={line} className="flex items-start gap-4 py-7">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink bg-lime">
                    <CheckIcon className="h-4 w-4 text-ink" />
                  </span>
                  <span className="text-[15px] leading-relaxed text-ink">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* closing band */}
        <section className="border-t-2 border-ink bg-ink">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-paper sm:text-4xl">Twelve weeks. One path. Start free.</h2>
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-paper/50">
                [ no card required · week one is open ]
              </p>
            </div>
            <LinkButton to="/signup" variant="primary" className="shrink-0">
              Create your account
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-ink py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
        © {new Date().getFullYear()} Become an AI Engineer
      </footer>
    </div>
  )
}
