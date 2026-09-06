// Supabase Edge Function: check-resource-links (PD-009)
//
// Sweeps every resource's URL and records last_checked_at / last_status_code
// / is_broken. Meant to run on a schedule — wire it up as a Supabase Cron
// Job (Dashboard: Edge Functions -> Cron, or `supabase functions deploy`
// plus a scheduled trigger) hitting this function's URL, e.g. daily.
// PD-009 is enforced entirely by what this function does NOT touch: it
// never edits lessons, never blocks a student's lesson_progress, and
// `is_broken` only ever surfaces in the admin BrokenLinksPage.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { chunk, classify } from './health.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CONCURRENCY = 5
const TIMEOUT_MS = 8000

async function checkUrl(url: string): Promise<number | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // HEAD first (cheaper); some sites reject HEAD (405/501), so fall back to GET.
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
    }
    return res.status
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: resources, error } = await supabase.from('resources').select('id, url')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let checked = 0
  let brokenCount = 0

  for (const batch of chunk(resources ?? [], CONCURRENCY)) {
    await Promise.all(
      batch.map(async (resource) => {
        const statusCode = await checkUrl(resource.url)
        const result = classify(statusCode)
        if (result.is_broken) brokenCount++
        checked++

        await supabase
          .from('resources')
          .update({
            last_checked_at: new Date().toISOString(),
            last_status_code: result.status_code,
            is_broken: result.is_broken,
          })
          .eq('id', resource.id)
      }),
    )
  }

  return new Response(JSON.stringify({ ok: true, checked, brokenCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
