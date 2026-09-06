import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Field, Label } from '@/components/ui/Field'
import Callout from '@/components/ui/Callout'
import { AlertIcon } from '@/components/ui/icons'

export default function ResetPasswordRequestPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await requestPasswordReset(email)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px] rounded-panel border-[3px] border-ink bg-surface p-8 shadow-site">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ account recovery ]</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.03em] text-ink">
            Reset your password
          </h1>

          {sent ? (
            <Callout tone="pass" heading="check your email" className="mt-6">
              If an account exists for {email}, we sent a link to reset your password. Keep the card open — never navigate away silently.
            </Callout>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Field id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && (
                <Callout tone="fail" heading="couldn't send link" icon={<AlertIcon className="h-3.5 w-3.5" />}>
                  {error}
                </Callout>
              )}
              <Button type="submit" variant="site" disabled={submitting} className="w-full">
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-[14.5px] text-muted">
            <Link to="/login" className="font-bold text-blue-700">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
