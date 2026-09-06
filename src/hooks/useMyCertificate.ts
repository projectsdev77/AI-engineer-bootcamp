import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useMyCertificate() {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc('get_my_certificate')
      const row = Array.isArray(data) ? data[0] : data
      setCode(row?.code ?? null)
    })()
  }, [])

  return code
}
