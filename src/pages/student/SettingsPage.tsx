import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useProgressOverview } from '@/hooks/useProgressOverview'
import AppNav from '@/components/layout/AppNav'
import Card from '@/components/ui/Card'
import Callout from '@/components/ui/Callout'
import ProgressBar from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Field, Label, TextAreaField } from '@/components/ui/Field'

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { data } = useProgressOverview()
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
        background: form.background || null,
        weekly_hours_target: form.weekly_hours_target ? Number(form.weekly_hours_target) : null,
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

  const overall = data?.overall
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
          <Card className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-[15px] text-muted">{user?.email}</p>
            </div>
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Field id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="background">Background</Label>
              <TextAreaField
                id="background"
                value={form.background}
                onChange={(e) => setForm({ ...form, background: e.target.value })}
                rows={3}
                placeholder="e.g. 5 years as a backend engineer, new to ML"
              />
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
            </div>

            {error && <p className="text-sm font-bold text-fail-ink">{error}</p>}
            {saved && <Callout tone="pass">Saved.</Callout>}

            <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Card>

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

            <div className="rounded-panel border-2 border-fail bg-fail-bg p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fail-ink">Session</p>
              <p className="mt-2 text-[14px] text-fail-ink">Signing out ends your session on this device.</p>
              <Button type="button" variant="secondary" onClick={() => void signOut()} className="mt-4 border-fail text-fail-ink">
                Log out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
