// Supabase Edge Function: check-resource-links (PD-009)
//
// Sweeps every resource's URL and records last_checked_at / last_status_code
// / is_broken. Meant to run on a schedule — wire it up as a Supabase Cron
// Job (Dashboard: Edge Functions -> Cron, or `supabase functions deploy`
// plus a scheduled trigger) hitting this function's URL, e.g. daily.
// PD-009 is enforced entirely by what this function does NOT touch: it
// never edits lessons, never blocks a student's lesson_progress, and
// `is_broken` only ever surfaces in the admin BrokenLinksPage.
//
// Admin's role is scoped to content management + broken-link monitoring
// (they no longer evaluate submissions), so this is also where that
// monitoring actually happens: any resource that WASN'T broken on the
// previous sweep and IS now gets emailed to every admin, once per sweep
// (not once per resource forever — a link can go broken, get fixed, and
// break again, and each of those should notify).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { chunk, classify } from './health.ts'
import { escapeHtml, sendEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

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

interface NewlyBroken {
  id: string
  title: string
  url: string
  status_code: number | null
  lessonTitle: string
  weekPosition: number
}

async function notifyAdmins(supabase: ReturnType<typeof createClient>, newlyBroken: NewlyBroken[]) {
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  if (!admins || admins.length === 0) return

  const rows = newlyBroken
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.title)}</strong> (HTTP ${r.status_code ?? 'no response'}) — Week ${r.weekPosition}, ${escapeHtml(r.lessonTitle)}<br>` +
        `<a href="${escapeHtml(r.url)}">${escapeHtml(r.url)}</a></li>`,
    )
    .join('')
  const html = `<p>${newlyBroken.length} resource link${newlyBroken.length === 1 ? '' : 's'} just started failing health checks:</p>
<ul>${rows}</ul>
<p><a href="${SITE_URL}/admin/broken-links">Review broken links</a></p>`

  for (const admin of admins) {
    const { data: authUser } = await supabase.auth.admin.getUserById(admin.id as string)
    const email = authUser?.user?.email
    if (!email) continue
    try {
      await sendEmail({
        to: email,
        subject: `${newlyBroken.length} broken link${newlyBroken.length === 1 ? '' : 's'} found`,
        html,
      })
    } catch (e) {
      console.error(`Failed to notify admin ${admin.id as string}`, e)
    }
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: resources, error } = await supabase.from('resources').select('id, url, title, lesson_id, is_broken')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let checked = 0
  let brokenCount = 0
  const newlyBrokenIds: { id: string; status_code: number | null }[] = []

  for (const batch of chunk(resources ?? [], CONCURRENCY)) {
    await Promise.all(
      batch.map(async (resource) => {
        const statusCode = await checkUrl(resource.url as string)
        const result = classify(statusCode)
        if (result.is_broken) {
          brokenCount++
          if (!resource.is_broken) {
            newlyBrokenIds.push({ id: resource.id as string, status_code: result.status_code })
          }
        }
        checked++

        await supabase
          .from('resources')
          .update({
            last_checked_at: new Date().toISOString(),
            last_status_code: result.status_code,
            is_broken: result.is_broken,
          })
          .eq('id', resource.id as string)
      }),
    )
  }

  if (newlyBrokenIds.length > 0) {
    const ids = newlyBrokenIds.map((r) => r.id)
    const { data: rows } = await supabase.from('resources').select('id, title, url, lesson_id').in('id', ids)

    const lessonIds = [...new Set((rows ?? []).map((r) => r.lesson_id as string))]
    const { data: lessons } = lessonIds.length
      ? await supabase.from('lessons').select('id, title, week_id').in('id', lessonIds)
      : { data: [] as { id: string; title: string; week_id: string }[] }
    const weekIds = [...new Set((lessons ?? []).map((l) => l.week_id as string))]
    const { data: weeks } = weekIds.length
      ? await supabase.from('weeks').select('id, title, position').in('id', weekIds)
      : { data: [] as { id: string; title: string; position: number }[] }

    const lessonById = new Map((lessons ?? []).map((l) => [l.id as string, l]))
    const weekById = new Map((weeks ?? []).map((w) => [w.id as string, w]))
    const statusById = new Map(newlyBrokenIds.map((r) => [r.id, r.status_code]))

    const newlyBroken: NewlyBroken[] = (rows ?? []).map((r) => {
      const lesson = lessonById.get(r.lesson_id as string)
      const week = lesson ? weekById.get(lesson.week_id as string) : undefined
      return {
        id: r.id as string,
        title: r.title as string,
        url: r.url as string,
        status_code: statusById.get(r.id as string) ?? null,
        lessonTitle: (lesson?.title as string) ?? 'Unknown lesson',
        weekPosition: (week?.position as number) ?? 0,
      }
    })

    await notifyAdmins(supabase, newlyBroken)
  }

  return new Response(JSON.stringify({ ok: true, checked, brokenCount, newlyBroken: newlyBrokenIds.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
