import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Field, Label } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'

// Reached via the link in the reset email. Supabase's client library
// exchanges the URL's recovery token for a session automatically on load
// (detectSessionInUrl, on by default), so by the time this renders the
// user already has an active (recovery-scoped) session and can call
// updateUser directly.
export default function ResetPasswordConfirmPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px] rounded-panel border-[3px] border-ink bg-surface p-8 shadow-site">
          {done ? (
            <>
              <Callout tone="pass" heading="password updated">
                You can now log in with your new password.
              </Callout>
              <Button variant="site" onClick={() => navigate('/dashboard')} className="mt-6 w-full">
                Go to dashboard
              </Button>
            </>
          ) : (
            <>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ almost done ]</p>
              <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.03em] text-ink">
                Choose a new password
              </h1>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <Field
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Callout tone="fail" heading="couldn't update password" icon={<AlertIcon className="h-3.5 w-3.5" />}>
                    {error}
                  </Callout>
                )}
                <Button type="submit" variant="site" disabled={submitting} className="w-full">
                  {submitting ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
