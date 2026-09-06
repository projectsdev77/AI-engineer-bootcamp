// Pure logic, kept separate from index.ts's Deno/network shell so it can
// be unit-tested with plain Node (see index.ts's comment on why — no Deno
// runtime available in this environment).

export interface CheckResult {
  status_code: number | null
  is_broken: boolean
}

/** A resource is broken if the request errored outright, or came back 4xx/5xx. Redirects (3xx) are fine. */
export function classify(statusCode: number | null): CheckResult {
  return {
    status_code: statusCode,
    is_broken: statusCode === null || statusCode >= 400,
  }
}

/** Splits an array into fixed-size chunks, for bounded-concurrency processing. */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
