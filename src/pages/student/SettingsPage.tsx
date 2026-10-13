import { useEffect, useRef, useState } from 'react'
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
import PasswordRequirementsList from '@/components/ui/PasswordRequirementsList'
import { validatePassword } from '@/lib/passwordPolicy'
import { normalizeCalLink } from '@/lib/calLink'
import { uploadAvatar, removeOtherAvatars } from '@/lib/avatarUpload'

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const isStudent = profile?.role === 'student'
  const isMentor = profile?.role === 'mentor'
  const [form, setForm] = useState({
    full_name: '',
    background: '',
    weekly_hours_target: '',
    title: '',
    avatar_url: '',
    cal_link: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function handlePhotoPicked(file: File | undefined) {
    if (!user || !file) return
    setSaved(false)
    setError(null)
    setUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      setForm((f) => ({ ...f, avatar_url: url }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        background: profile.background ?? '',
        weekly_hours_target: profile.weekly_hours_target != null ? String(profile.weekly_hours_target) : '',
        title: profile.title ?? '',
        avatar_url: profile.avatar_url ?? '',
        cal_link: profile.cal_link ?? '',
      })
    }
  }, [profile])

  async function handleSave() {
    if (!user) return
    setSaved(false)
    setError(null)

    let mentorFields = {}
    if (isMentor) {
      const cal = normalizeCalLink(form.cal_link)
      if (cal.error) {
        setError(cal.error)
        return
      }
      const photo = form.avatar_url.trim()
      mentorFields = { title: form.title.trim() || null, avatar_url: photo || null, cal_link: cal.value }
      if (cal.value) setForm((f) => ({ ...f, cal_link: cal.value ?? '' }))
    }

    setSaving(true)
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
        ...mentorFields,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    if (isMentor) void removeOtherAvatars(user.id, form.avatar_url.trim() || null)
    await refreshProfile()
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={form.full_name || profile?.full_name} src={isMentor ? form.avatar_url.trim() : null} size={72} />
        {isMentor && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInput}
                id="avatar_file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => void handlePhotoPicked(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : form.avatar_url ? 'Change photo' : 'Upload photo'}
              </Button>
              {form.avatar_url && !uploading && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatar_url: '' }))}
                  className="font-mono text-[11.5px] font-bold uppercase tracking-[0.06em] text-blue-700 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[13px] text-muted">JPG, PNG or WebP. Students see it when booking you. Click Save to keep it.</p>
          </div>
        )}
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
      {isMentor && (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Field
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior ML Engineer at Acme"
            />
          </div>
          <div>
            <Label htmlFor="cal_link">Cal.com link</Label>
            <Field
              id="cal_link"
              value={form.cal_link}
              onChange={(e) => setForm({ ...form, cal_link: e.target.value })}
              placeholder="https://cal.com/your-name"
            />
            <FieldHint>
              Your profile link, not a single event's link, so students see both session types. Students can book you
              from the coaching page once this is set.
            </FieldHint>
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
  const { user, updatePassword } = useAuth()
  // A Google-only account (never set a password) has no 'email' identity —
  // Supabase adds one automatically the first time updateUser({password})
  // succeeds for such an account, so this flips to the normal "change"
  // flow from then on. Without this check, the current-password field
  // below is impossible to fill in truthfully for a Google-only user,
  // permanently blocking them from ever setting a first password.
  const hasPassword = user?.identities?.some((i) => i.provider === 'email') ?? true

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
    const { error } = await updatePassword(newPassword, hasPassword ? currentPassword : undefined)
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
      <p className="meta">{hasPassword ? 'Change password' : 'Set a password'}</p>
      {!hasPassword && (
        <p className="text-[13.5px] text-muted">
          You signed up with Google and haven't set a password yet. Set one below to also be able to log in with
          your email and password.
        </p>
      )}
      {hasPassword && (
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
      )}
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
        <PasswordRequirementsList password={newPassword} />
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
        disabled={saving || (hasPassword && !currentPassword) || !newPassword || !confirmPassword}
      >
        {saving ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
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
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDelete()}
              disabled={confirmText !== 'DELETE' || deleting}
              className="w-full border-fail bg-fail text-white"
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
              className="w-full"
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
            {isStudent && data?.payment_status && (
              <Card>
                <p className="meta">Plan</p>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  {data.payment_status === 'paid' ? 'Full access' : 'Free week'}
                </p>
                <p className="mt-1.5 text-[13.5px] text-muted">
                  {data.payment_status === 'paid'
                    ? 'You have full access to all 12 weeks.'
                    : 'Week 1 is free. Contact us to unlock the rest of the program.'}
                </p>
              </Card>
            )}

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
