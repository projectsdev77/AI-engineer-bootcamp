import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PublicNav from '@/components/layout/PublicNav'
import CertificateCard from '@/components/certificate/CertificateCard'
import Callout from '@/components/ui/Callout'
import { AlertIcon, CheckIcon } from '@/components/ui/icons'

interface CertificateSnapshot {
  title_text: string
  body_text: string
  signature_name: string | null
  signature_title: string | null
  logo_url: string | null
  accent_color: string | null
}

export default function CertificatePage() {
  const { code } = useParams()
  const [snapshot, setSnapshot] = useState<CertificateSnapshot | null>(null)
  const [issuedAt, setIssuedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return
    ;(async () => {
      const { data, error } = await supabase.rpc('get_certificate_by_code', { p_code: code })
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row) {
        setNotFound(true)
      } else {
        setSnapshot(row.rendered_snapshot as CertificateSnapshot)
        setIssuedAt(row.issued_at as string)
      }
      setLoading(false)
    })()
  }, [code])

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {loading && (
          <p className="text-center font-mono text-xs font-bold uppercase tracking-wide text-muted">loading…</p>
        )}

        {!loading && (
          <p className="mb-6 flex justify-center">
            {notFound ? (
              <span className="pill pill-fail">
                <AlertIcon className="h-3 w-3" /> invalid code · {code}
              </span>
            ) : (
              <span className="pill pill-pass">
                <CheckIcon className="h-3 w-3" /> verified certificate · code {code}
              </span>
            )}
          </p>
        )}

        {!loading && notFound && (
          <Callout tone="fail" heading="Certificate not found" icon={<AlertIcon className="h-3.5 w-3.5" />} className="mx-auto max-w-md text-center">
            No certificate matches this code. Double-check the link, or go home.
          </Callout>
        )}

        {!loading && snapshot && (
          <>
            <CertificateCard fields={snapshot} />
            <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-faint">
              issued {issuedAt && new Date(issuedAt).toLocaleDateString()} · anyone with this code can verify it
            </p>
          </>
        )}
      </main>
    </div>
  )
}
