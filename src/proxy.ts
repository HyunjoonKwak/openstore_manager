import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const isDev = process.env.NODE_ENV === 'development'

// Generate a per-request CSP nonce using Web Crypto (Edge-safe, no node:crypto).
function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

// Derive Supabase origins from env at runtime instead of hardcoding.
function getSupabaseSources(): string[] {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!rawUrl) return []
  try {
    const url = new URL(rawUrl)
    return [url.origin, `wss://${url.host}`]
  } catch {
    return []
  }
}

function buildCsp(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Next.js dev tooling requires eval; never allowed in production.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ]

  const connectSrc = [
    "'self'",
    ...getSupabaseSources(),
    // HMR websocket in development only.
    ...(isDev ? ['ws://localhost:*'] : []),
  ]

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // Tailwind and Next.js emit inline style attributes/tags.
    "style-src 'self' 'unsafe-inline'",
    // Scraped product images come from arbitrary https hosts.
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    // External competitor page previews are embedded in iframes.
    'frame-src https:',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce()
  const csp = buildCsp(nonce)

  // Set CSP on the request headers BEFORE updateSession runs. updateSession
  // forwards the whole request via NextResponse.next({ request }) (both on its
  // initial response and after Supabase cookie writes), so Next.js sees this
  // header as a request-header override and applies the nonce to its own
  // framework inline scripts. Cookie handling is untouched: Supabase mutates
  // request.cookies on this same request object.
  request.headers.set('content-security-policy', csp)

  const response = await updateSession(request)

  // Mirror the policy on the outgoing response so browsers enforce it.
  response.headers.set('content-security-policy', csp)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
