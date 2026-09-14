// Every one of these functions is invoked cross-origin — the app's own
// domain is never the same origin as *.supabase.co — and supabase-js's
// functions.invoke() always attaches a custom Authorization header, which
// forces the browser to send a CORS preflight (OPTIONS) before the real
// request. None of these functions answered that preflight, so the browser
// silently blocked every real call before it ever reached the function's
// code — surfacing client-side as a generic "Failed to send a request to
// the Edge Function", indistinguishable from the function not being
// deployed at all.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Call first in every handler. Returns a response to send immediately if this request was a preflight. */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  return null
}
