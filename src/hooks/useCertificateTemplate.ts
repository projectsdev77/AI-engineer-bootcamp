import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CertificateTemplate } from '@/types/database'

const DEFAULTS = {
  name: 'Default',
  title_text: 'Certificate of Completion',
  body_text:
    'This certifies that {{student_name}} has successfully completed {{track_title}} on {{completion_date}}.',
  signature_name: '',
  signature_title: '',
  logo_url: '',
  accent_color: '#1d4ed8',
}

export function useCertificateTemplate() {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    // Deliberately not setLoading(true) here: createDefault()/save() also
    // call refresh(), and flipping loading back to true on every save
    // would unmount the whole editor back to a full-page spinner on every
    // click, which reads as the page reloading.
    const { data, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setTemplate(data as CertificateTemplate | null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createDefault() {
    const { error } = await supabase
      .from('certificate_templates')
      .insert({ ...DEFAULTS, is_active: true })
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  async function save(fields: Partial<CertificateTemplate>) {
    if (!template) return false
    const { error } = await supabase.from('certificate_templates').update(fields).eq('id', template.id)
    if (error) {
      setError(error.message)
      return false
    }
    await refresh()
    return true
  }

  return { template, loading, error, createDefault, save, refresh }
}
