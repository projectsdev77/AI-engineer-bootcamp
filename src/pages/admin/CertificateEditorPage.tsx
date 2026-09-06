import { useEffect, useState } from 'react'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import CertificateCard from '@/components/certificate/CertificateCard'
import { FullPageSpinner } from '@/routes/ProtectedRoute'
import { useCertificateTemplate } from '@/hooks/useCertificateTemplate'

const SAMPLE = {
  student_name: 'Jamie Rivera',
  track_title: 'Become an AI Engineer',
  completion_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  certificate_code: 'SAMPLE1234',
}

function substitutePreview(template: string): string {
  return template
    .replaceAll('{{student_name}}', SAMPLE.student_name)
    .replaceAll('{{track_title}}', SAMPLE.track_title)
    .replaceAll('{{completion_date}}', SAMPLE.completion_date)
    .replaceAll('{{certificate_code}}', SAMPLE.certificate_code)
}

export default function CertificateEditorPage() {
  const { template, loading, error, createDefault, save } = useCertificateTemplate()
  const [form, setForm] = useState({
    title_text: '',
    body_text: '',
    signature_name: '',
    signature_title: '',
    logo_url: '',
    accent_color: '#1d4ed8',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (template) {
      setForm({
        title_text: template.title_text,
        body_text: template.body_text,
        signature_name: template.signature_name ?? '',
        signature_title: template.signature_title ?? '',
        logo_url: template.logo_url ?? '',
        accent_color: template.accent_color ?? '#1d4ed8',
      })
    }
  }, [template])

  async function handleSave() {
    setSaving(true)
    await save({
      title_text: form.title_text,
      body_text: form.body_text,
      signature_name: form.signature_name || null,
      signature_title: form.signature_title || null,
      logo_url: form.logo_url || null,
      accent_color: form.accent_color || null,
    })
    setSaving(false)
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificate template</h1>
        <p className="mt-1 text-sm text-slate-500">
          Structured fields only — merge fields are substituted into escaped text, so nothing you type
          here can become markup on the public certificate page.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!template && !error && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-600">No active template yet.</p>
            <button
              onClick={() => void createDefault()}
              className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Create default template
            </button>
          </div>
        )}

        {template && (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <label className="block text-xs font-medium text-slate-500">Title</label>
                <input
                  value={form.title_text}
                  onChange={(e) => setForm({ ...form, title_text: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Body — supports {'{{student_name}}'}, {'{{track_title}}'}, {'{{completion_date}}'},{' '}
                  {'{{certificate_code}}'}
                </label>
                <textarea
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Signature name</label>
                  <input
                    value={form.signature_name}
                    onChange={(e) => setForm({ ...form, signature_name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Signature title</label>
                  <input
                    value={form.signature_title}
                    onChange={(e) => setForm({ ...form, signature_title: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Logo URL</label>
                  <input
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Accent color</label>
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-slate-300"
                  />
                </div>
              </div>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Live preview (sample data)
              </p>
              <CertificateCard
                fields={{
                  title_text: form.title_text,
                  body_text: substitutePreview(form.body_text),
                  signature_name: form.signature_name,
                  signature_title: form.signature_title,
                  logo_url: form.logo_url,
                  accent_color: form.accent_color,
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
