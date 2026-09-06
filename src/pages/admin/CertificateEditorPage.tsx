import { useEffect, useState } from 'react'
import AppNav from '@/components/layout/AppNav'
import AdminNav from '@/components/layout/AdminNav'
import CertificateCard from '@/components/certificate/CertificateCard'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Label, TextAreaField, FieldHint } from '@/components/ui/Field'
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
    <div className="min-h-screen bg-paper">
      <AppNav />
      <AdminNav />
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ public-facing template ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Certificate template</h1>
        <p className="mt-2 max-w-2xl text-[14.5px] text-muted">
          Structured fields only — merge fields are substituted into escaped text, so nothing you type here can
          become markup on the public certificate page.
        </p>

        {error && <p className="mt-4 text-sm font-bold text-fail-ink">{error}</p>}

        {!template && !error && (
          <div className="mt-6 rounded-panel border-2 border-dashed border-disabled p-8 text-center">
            <p className="text-[14.5px] text-muted">No active template yet.</p>
            <Button type="button" variant="primary" onClick={() => void createDefault()} className="mt-4">
              Create default template
            </Button>
          </div>
        )}

        {template && (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <Card className="space-y-4">
              <div>
                <Label htmlFor="title_text">Title</Label>
                <Field id="title_text" value={form.title_text} onChange={(e) => setForm({ ...form, title_text: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="body_text">Body</Label>
                <TextAreaField id="body_text" value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={4} />
                <FieldHint>
                  supports {'{{student_name}}'}, {'{{track_title}}'}, {'{{completion_date}}'}, {'{{certificate_code}}'}
                </FieldHint>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signature_name">Signature name</Label>
                  <Field id="signature_name" value={form.signature_name} onChange={(e) => setForm({ ...form, signature_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="signature_title">Signature title</Label>
                  <Field id="signature_title" value={form.signature_title} onChange={(e) => setForm({ ...form, signature_title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Field id="logo_url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="accent_color">Accent color</Label>
                  <input
                    id="accent_color"
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="mt-0 h-11 w-full rounded-field border-2 border-ink"
                  />
                </div>
              </div>
              <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Card>

            <div>
              <p className="meta mb-3">Live preview (sample data)</p>
              <div className="flex items-center justify-center rounded-panel border-2 border-ink bg-stone p-8">
                <div style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
