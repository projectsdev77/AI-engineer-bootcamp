import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useProgressOverview } from '@/hooks/useProgressOverview'
import AppNav from '@/components/layout/AppNav'
import Card from '@/components/ui/Card'
import Callout from '@/components/ui/Callout'
import ProgressBar from '@/components/ui/ProgressBar'
import Avatar from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Label, TextAreaField, FieldHint } from '@/components/ui/Field'
import { PASSWORD_REQUIREMENTS_TEXT, validatePassword } from '@/lib/passwordPolicy'

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const isStudent = profile?.role === 'student'
  const [form, setForm] = useState({ full_name: '', background: '', weekly_hours_target: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        background: profile.background ?? '',
        weekly_hours_target: profile.weekly_hours_target != null ? String(profile.weekly_hours_target) : '',
      })
    }
  }, [profile])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name || null,
        ...(isStudent
          ? {
              background: form.background || null,
              weekly_hours_target: form.weekly_hours_target ? Number(form.weekly_hours_target) : null,
            }
          : {}),
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    await refreshProfile()
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={form.full_name || profile?.full_name} size={56} />
        <p className="text-[13px] text-muted">Your avatar shows the first letter of your name.</p>
      </div>
      <div>
        <Label>Email</Label>
        <p className="text-[15px] text-muted">{user?.email}</p>
      </div>
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Field id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      {isStudent && (
        <>
          <div>
            <Label htmlFor="background">Background</Label>
            <TextAreaField
              id="background"
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              rows={3}
              placeholder="e.g. 5 years as a backend engineer, new to ML"
            />
            <FieldHint>Shared with your mentor so they can tailor feedback to your experience.</FieldHint>
          </div>
          <div>
            <Label htmlFor="weekly_hours_target">Weekly hours target</Label>
            <Field
              id="weekly_hours_target"
              type="number"
              min="0"
              value={form.weekly_hours_target}
              onChange={(e) => setForm({ ...form, weekly_hours_target: e.target.value })}
              className="w-28"
            />
            <FieldHint>Tracked on your dashboard against time you log completing resources.</FieldHint>
          </div>
        </>
      )}

      {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
      {saved && <Callout tone="pass">Saved.</Callout>}

      <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </Card>
  )
}

function PasswordForm() {
  const { updatePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSave() {
    setError(null)
    setSaved(false)
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    setSaving(true)
    const { error } = await updatePassword(newPassword, currentPassword)
    setSaving(false)
    if (error) {
      setError(error)
      return
    }
    setSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <Card className="space-y-4">
      <p className="meta">Change password</p>
      <div>
        <Label htmlFor="current_password">Current password</Label>
        <Field
          id="current_password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="new_password">New password</Label>
        <Field
          id="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <FieldHint>{PASSWORD_REQUIREMENTS_TEXT}</FieldHint>
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Field
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          error={mismatch}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
      {saved && <Callout tone="pass">Password updated.</Callout>}

      <Button
        type="button"
        variant="primary"
        onClick={() => void handleSave()}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
      >
        {saving ? 'Updating…' : 'Update password'}
      </Button>
    </Card>
  )
}

function DangerZone() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    const { error } = await deleteAccount()
    setDeleting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="rounded-panel border-2 border-fail bg-fail-bg p-6">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fail-ink">Delete account</p>
      <p className="mt-2 text-[14px] text-fail-ink">
        Permanently deletes your account and everything tied to it — submissions, messages, progress. This cannot be
        undone.
      </p>

      {!confirming ? (
        <Button type="button" variant="secondary" onClick={() => setConfirming(true)} className="mt-4 border-fail text-fail-ink">
          Delete my account
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <Label htmlFor="confirm_delete">Type DELETE to confirm</Label>
          <Field id="confirm_delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="border-fail" />
          {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDelete()}
              disabled={confirmText !== 'DELETE' || deleting}
              className="border-fail bg-fail text-white"
            >
              {deleting ? 'Deleting…' : 'Permanently delete'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConfirming(false)
                setConfirmText('')
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { profile } = useAuth()
  const isStudent = profile?.role === 'student'
  const { data } = useProgressOverview()

  const overall = isStudent ? data?.overall : undefined
  const overallPercent =
    overall && overall.resources_total > 0
      ? Math.round((overall.resources_completed / overall.resources_total) * 100)
      : 0

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ your account ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Profile & settings</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <ProfileForm />
            <PasswordForm />
          </div>

          <div className="space-y-6">
            {overall && (
              <Card>
                <p className="meta">Overall progress</p>
                <p className="mt-2 font-display text-4xl font-bold text-ink">{overallPercent}%</p>
                <div className="mt-3">
                  <ProgressBar percent={overallPercent} tone="ink" />
                </div>
              </Card>
            )}

            <DangerZone />
          </div>
        </div>
      </main>
    </div>
  )
}
