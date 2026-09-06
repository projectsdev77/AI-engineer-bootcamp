import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
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

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile & settings</h1>

        <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <label className="block text-xs font-medium text-slate-500">Email</label>
            <p className="mt-1 text-sm text-slate-700">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Background</label>
            <textarea
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              rows={3}
              placeholder="e.g. 5 years as a backend engineer, new to ML"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Weekly hours target</label>
            <input
              type="number"
              min="0"
              value={form.weekly_hours_target}
              onChange={(e) => setForm({ ...form, weekly_hours_target: e.target.value })}
              className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Saved.</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </main>
    </div>
  )
}
