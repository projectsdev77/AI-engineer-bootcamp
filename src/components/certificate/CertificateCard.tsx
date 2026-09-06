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
  const accent = fields.accent_color || '#1d4ed8'
  return (
    <div
      className="mx-auto max-w-2xl rounded-lg border-4 bg-white p-10 text-center shadow-sm"
      style={{ borderColor: accent }}
    >
      {fields.logo_url && (
        <img src={fields.logo_url} alt="" className="mx-auto mb-6 h-12 object-contain" />
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Become an AI Engineer
      </p>
      <h1 className="mt-3 text-3xl font-bold" style={{ color: accent }}>
        {fields.title_text}
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-slate-700">{fields.body_text}</p>
      {(fields.signature_name || fields.signature_title) && (
        <div className="mt-10 inline-block border-t border-slate-300 pt-2">
          {fields.signature_name && <p className="font-medium text-slate-800">{fields.signature_name}</p>}
          {fields.signature_title && <p className="text-xs text-slate-500">{fields.signature_title}</p>}
        </div>
      )}
    </div>
  )
}
