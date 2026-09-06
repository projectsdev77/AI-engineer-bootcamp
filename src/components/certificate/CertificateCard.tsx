import { Monogram } from '@/components/ui/icons'

export interface CertificateFields {
  title_text: string
  body_text: string
  signature_name?: string | null
  signature_title?: string | null
  logo_url?: string | null
  accent_color?: string | null
}

// Renders every field as plain JSX text content (never dangerouslySetInnerHTML).
// PD-011: an admin-editable HTML blob on a public page would be a stored XSS
// vector, and body_text can carry a student-supplied name via the
// {{student_name}} merge field — React's default text-node escaping is what
// actually keeps this safe, not any sanitization step, so that property must
// never be relaxed here.
export default function CertificateCard({ fields }: { fields: CertificateFields }) {
  const accent = fields.accent_color || 'var(--color-lime)'
  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-panel border-2 border-ink bg-surface shadow-app">
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-7 py-4">
        <div className="flex items-center gap-2.5">
          <Monogram size={24} />
          {fields.logo_url ? (
            <img src={fields.logo_url} alt="" className="h-6 object-contain" />
          ) : (
            <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-paper">
              Become an AI Engineer
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-paper/50">Certificate</span>
      </div>

      <div className="px-8 py-10 text-center sm:px-12">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">Certificate of completion</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">{fields.title_text}</h1>
        <div className="mx-auto mt-3 h-1.5 w-24 rounded-full" style={{ background: accent }} />
        <p className="mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-ink">{fields.body_text}</p>

        {(fields.signature_name || fields.signature_title) && (
          <div className="mx-auto mt-10 inline-block border-t-2 border-ink pt-2 text-left">
            {fields.signature_name && <p className="font-bold text-ink">{fields.signature_name}</p>}
            {fields.signature_title && (
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                {fields.signature_title}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
