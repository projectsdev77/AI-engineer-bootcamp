import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PublicNav from '@/components/layout/PublicNav'
import AppNav from '@/components/layout/AppNav'
import CertificateCard from '@/components/certificate/CertificateCard'
import Callout from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { AlertIcon, CheckIcon, CopyIcon, DownloadIcon } from '@/components/ui/icons'

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
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<CertificateSnapshot | null>(null)
  const [issuedAt, setIssuedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) —
      // the link is still visible in the address bar either way.
    }
  }

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
      {/* Reached both from the app itself (a signed-in student's "View
          certificate" link) and from outside it (anyone verifying a shared
          link) — showing PublicNav's "log in"/"get started" to an already
          signed-in visitor read as if the click had logged them out, even
          though the session itself was never touched. */}
      {user ? <AppNav /> : <PublicNav />}
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
            <div className="certificate-print">
              <CertificateCard fields={snapshot} />
            </div>
            <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-faint">
              issued {issuedAt && new Date(issuedAt).toLocaleDateString()} · anyone with this code can verify it
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
              <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                <CopyIcon className="h-4 w-4" /> {copied ? 'Link copied!' : 'Copy link'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <DownloadIcon className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
