import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PublicNav from '@/components/layout/PublicNav'
import CertificateCard from '@/components/certificate/CertificateCard'

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
    <div className="min-h-screen bg-white">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {loading && <p className="text-center text-sm text-slate-400">Loading…</p>}

        {!loading && notFound && (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">Certificate not found</p>
            <p className="mt-2 text-sm text-slate-500">
              Double-check the link, or{' '}
              <Link to="/" className="text-brand-600 hover:underline">
                go home
              </Link>
              .
            </p>
          </div>
        )}

        {!loading && snapshot && (
          <>
            <CertificateCard fields={snapshot} />
            <p className="mt-6 text-center text-xs text-slate-400">
              Verified certificate · code {code} · issued{' '}
              {issuedAt && new Date(issuedAt).toLocaleDateString()}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
