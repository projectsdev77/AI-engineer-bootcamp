import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Field, Label } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon, GoogleIcon } from '@/components/ui/icons'
import authIll from '@/assets/illustrations/auth-hero.jpg'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate(from, { replace: true })
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-10 pb-[88px] pt-[72px] min-[900px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="mx-auto flex w-full max-w-[420px] flex-col gap-[26px] min-[900px]:mx-0 min-[900px]:justify-self-end">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs tracking-[0.18em] text-ink">[ WELCOME BACK ]</p>
            <h1 className="font-display text-[46px] font-bold leading-[1.02] tracking-[-0.03em] text-ink">Log in</h1>
          </div>

          {error && (
            <Callout tone="fail" heading="couldn't log in" icon={<AlertIcon className="h-3.5 w-3.5" />}>
              {error}
            </Callout>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="font-medium tracking-[0.14em]">
                Email
              </Label>
              <Field
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[12px] bg-paper focus:border-ink focus:shadow-[4px_4px_0_var(--color-lime)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="password" className="font-medium tracking-[0.14em]">
                  Password
                </Label>
                <Link to="/reset-password" className="font-mono text-[11px] tracking-[0.14em] text-ink underline">
                  FORGOT?
                </Link>
              </div>
              <Field
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[12px] bg-paper focus:border-ink focus:shadow-[4px_4px_0_var(--color-lime)] focus:outline-none"
              />
            </div>

            <Button type="submit" variant="site" disabled={submitting} className="mt-1 w-full rounded-[12px] border-2">
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <div className="flex items-center gap-3.5 font-mono text-[11px] tracking-[0.14em] text-faint">
            <span className="h-px flex-1 bg-hairline" />
            OR
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <Button type="button" variant="secondary" onClick={handleGoogle} className="w-full rounded-[12px]">
            <GoogleIcon size={17} />
            Continue with Google
          </Button>

          <p className="text-[14px] leading-relaxed text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-ink">
              Sign up
            </Link>
          </p>
        </section>

        <section className="flex items-center justify-center">
          <img
            src={authIll}
            alt="Learners studying on phones and laptops"
            className="block h-auto w-full max-w-[620px]"
            style={{ mixBlendMode: 'multiply' }}
          />
        </section>
      </main>
    </div>
  )
}
