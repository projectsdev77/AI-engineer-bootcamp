import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Field, Label } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'

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
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px] rounded-panel border-[3px] border-ink bg-surface p-8 shadow-site">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ welcome back ]</p>
          <h1 className="mt-2 font-display text-[38px] font-bold leading-none tracking-[-0.03em] text-ink">Log in</h1>

          {error && (
            <Callout tone="fail" heading="couldn't log in" icon={<AlertIcon className="h-3.5 w-3.5" />} className="mt-6">
              {error}
            </Callout>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/reset-password" className="font-mono text-[11px] font-bold uppercase tracking-wide text-blue-700">
                  forgot?
                </Link>
              </div>
              <Field
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="site" disabled={submitting} className="w-full">
              {submitting ? 'Logging in…' : 'Log in'}
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
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-blue-700">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
