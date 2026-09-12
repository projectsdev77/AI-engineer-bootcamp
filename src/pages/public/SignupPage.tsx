import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, Label, FieldHint } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon, GoogleIcon } from '@/components/ui/icons'
import { PASSWORD_REQUIREMENTS_TEXT, validatePassword } from '@/lib/passwordPolicy'
import authIll from '@/assets/illustrations/auth-hero.jpg'

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    setSubmitting(true)
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    // Signup automatically enrolls the student (trigger-driven, PD-001/A-003)
    // once their session exists. If the project requires email confirmation
    // there's no session yet, so show a "check your email" state instead —
    // otherwise the user is already signed in, so go straight in.
    if (needsEmailConfirmation) {
      setConfirmSent(true)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error)
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen bg-paper">
        <PublicNav />
        <main className="flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[420px] rounded-[12px] border-2 border-ink bg-surface p-8 text-center shadow-site">
            <Callout tone="pass" heading="check your email" className="text-left">
              We sent a confirmation link to {email}. Click it to activate your account, then log in.
            </Callout>
            <LinkButton to="/login" variant="secondary" className="mt-6 w-full rounded-[12px]">
              Go to login
            </LinkButton>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-10 pb-[88px] pt-[72px] min-[900px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="mx-auto flex w-full max-w-[420px] flex-col gap-[26px] min-[900px]:mx-0 min-[900px]:justify-self-end">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs tracking-[0.18em] text-ink">[ WEEK ONE IS OPEN ]</p>
            <h1 className="font-display text-[46px] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
              Create your account
            </h1>
          </div>

          {error && (
            <Callout tone="fail" heading="couldn't sign up" icon={<AlertIcon className="h-3.5 w-3.5" />}>
              {error}
            </Callout>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="font-medium tracking-[0.14em]">
                Full name
              </Label>
              <Field
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-[12px] bg-paper focus:border-ink focus:shadow-[4px_4px_0_var(--color-lime)] focus:outline-none"
              />
            </div>
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
              <Label htmlFor="password" className="font-medium tracking-[0.14em]">
                Password
              </Label>
              <Field
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[12px] bg-paper focus:border-ink focus:shadow-[4px_4px_0_var(--color-lime)] focus:outline-none"
              />
              <FieldHint>{PASSWORD_REQUIREMENTS_TEXT}</FieldHint>
            </div>

            <Button type="submit" variant="site" disabled={submitting} className="mt-1 w-full rounded-[12px] border-2">
              {submitting ? 'Creating account…' : 'Create account'}
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
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-ink">
              Log in
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
