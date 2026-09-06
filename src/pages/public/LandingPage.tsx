import { Link } from 'react-router-dom'
import PublicNav from '@/components/layout/PublicNav'

const PILLARS = [
  {
    title: 'Sequenced, not scattered',
    body: 'Twelve weeks build on each other. You unlock week two by finishing week one — no picking a random tutorial and hoping it is the right next step.',
  },
  {
    title: 'Feedback on real work',
    body: 'Every assignment gets a response: AI-generated feedback the moment you submit, with a human mentor one request away if you want a second look.',
  },
  {
    title: 'Accountability without a cohort',
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
    <div className="min-h-screen bg-white">
      <PublicNav />

      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Become an AI Engineer
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            A self-paced, 12-week path for developers moving into AI engineering. Curated
            resources, original framing, real assignments, and feedback on every submission.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Start learning
            </Link>
            <Link
              to="/curriculum"
              className="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View the curriculum
            </Link>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-brand-600">
              Why this instead of another list of links
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Is this for you?</h2>
          <ul className="mt-6 space-y-3">
            {AUDIENCE.map((line) => (
              <li key={line} className="flex gap-3 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-slate-200 bg-brand-900">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-semibold text-white">Twelve weeks. One path. Start free.</h2>
            <Link
              to="/signup"
              className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-900 hover:bg-slate-100"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Become an AI Engineer
      </footer>
    </div>
  )
}
