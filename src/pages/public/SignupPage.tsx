import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, Label, FieldHint } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'
import { PASSWORD_REQUIREMENTS_TEXT, validatePassword } from '@/lib/passwordPolicy'
import authIll from '@/assets/illustrations/engineer-coding.png'

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
          <div className="w-full max-w-[420px] rounded-panel border-[3px] border-ink bg-surface p-8 text-center shadow-site">
            <Callout tone="pass" heading="check your email" className="text-left">
              We sent a confirmation link to {email}. Click it to activate your account, then log in.
            </Callout>
            <LinkButton to="/login" variant="secondary" className="mt-6 w-full">
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
      <main className="mx-auto flex max-w-[900px] flex-col-reverse items-center gap-10 px-4 py-16 lg:flex-row lg:items-stretch lg:justify-center">
        <div className="ill-frame hidden aspect-[3/4] w-[300px] shrink-0 lg:block">
          <img src={authIll} alt="" className="ill-photo" />
        </div>

        <div className="w-full max-w-[420px] rounded-panel border-[3px] border-ink bg-surface p-8 shadow-site">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ week one is open ]</p>
          <h1 className="mt-2 font-display text-[38px] font-bold leading-none tracking-[-0.03em] text-ink">Create your account</h1>

          {error && (
            <Callout tone="fail" heading="couldn't sign up" icon={<AlertIcon className="h-3.5 w-3.5" />} className="mt-6">
              {error}
            </Callout>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Field id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Field
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Field
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldHint>{PASSWORD_REQUIREMENTS_TEXT}</FieldHint>
            </div>

            <Button type="submit" variant="site" disabled={submitting} className="w-full">
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-hairline" />
            <span className="font-mono text-[11px] uppercase text-faint">or</span>
            <div className="h-px flex-1 bg-hairline" />
          </div>

          <Button type="button" variant="secondary" onClick={handleGoogle} className="w-full">
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-[14.5px] text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-700">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
