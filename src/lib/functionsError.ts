import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * supabase-js's invoke() sets error.message to the generic "Edge Function
 * returned a non-2xx status code" for every FunctionsHttpError, regardless
 * of what the function actually said — the real reason (our functions all
 * respond with `{ error: '...' }`) only lives in error.context, the raw
 * Response object. This reads that out, falling back to error.message for
 * every other error type (network/relay failures, which have no such body).
 */
export async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json()
      if (typeof body?.error === 'string' && body.error) return body.error
    } catch {
      // Body wasn't JSON, or already consumed — fall through to the generic message.
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}
