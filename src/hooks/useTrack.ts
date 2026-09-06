import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Track } from '@/types/database'

/** The single track (5.2: "one row in V1"). Admin-only — creates it on first use if missing. */
export function useTrack() {
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setTrack(data as Track | null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createDefaultTrack() {
    const { error } = await supabase.from('tracks').insert({
      title: 'Become an AI Engineer',
      slug: 'become-an-ai-engineer',
      description: 'A self-paced, 12-week path into AI engineering.',
      status: 'draft',
    })
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  return { track, loading, error, refresh, createDefaultTrack }
}
