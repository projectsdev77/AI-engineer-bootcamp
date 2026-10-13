// Mirrors the profiles_cal_link_format check constraint.
const CAL_LINK = /^https:\/\/cal\.com\/[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Turns whatever an admin pasted (cal.com/jane, https://www.cal.com/jane/,
 * …) into the canonical https://cal.com/jane form, or explains what's wrong.
 * Empty input means "no link" — the mentor just won't be bookable.
 */
export function normalizeCalLink(input: string): { value: string | null; error: string | null } {
  let link = input.trim()
  if (!link) return { value: null, error: null }

  link = link.replace(/^(https?:\/\/)?(www\.)?/i, 'https://').replace(/\/+$/, '')

  if (CAL_LINK.test(link)) return { value: link, error: null }

  if (/^https:\/\/cal\.com\/[^/]+\/.+/.test(link)) {
    return {
      value: null,
      error: 'Use the profile link (cal.com/name), not a single event link. Otherwise students only see one session type.',
    }
  }
  return { value: null, error: 'Enter a Cal.com profile link, like https://cal.com/jane-doe.' }
}

/** The path part the Cal.com embed expects ("jane-doe" for https://cal.com/jane-doe). */
export function calPath(calLink: string): string {
  return new URL(calLink).pathname.replace(/^\/+|\/+$/g, '')
}
