import {NextResponse} from 'next/server'
import {rateLimit} from '@/lib/rate-limit'
import {requestSchema} from '@/lib/requests'
import {SITE_URL} from '@/lib/site'

const MAX_BODY = 8 * 1024 // a real request is well under 1 KB
const JSON_HEADERS = {'Cache-Control': 'no-store'}
const reply = (body: unknown, status: number, extra: Record<string, string> = {}) => NextResponse.json(body, {status, headers: {...JSON_HEADERS, ...extra}})

/** Only the site's own pages may post here (blocks other websites and casual scripted abuse). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const o = new URL(origin)
    const allowed = new Set([new URL(SITE_URL).host, new URL(SITE_URL).host.replace(/^www\./, ''), `www.${new URL(SITE_URL).host.replace(/^www\./, '')}`, 'localhost:3000', 'localhost:3100'])
    return allowed.has(o.host)
  } catch {
    return false
  }
}

/**
 * Bookings, tours, viewings and applications are transactional, so they do not live in Sanity.
 * With BOOKING_API_URL set this forwards to the booking API (docs/openapi.yaml).
 * Without it the route validates and acknowledges in demo mode, and says so in the response. Nothing is stored or logged.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({code: 'FORBIDDEN_ORIGIN'}, 403)

  const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const limit = rateLimit(`requests:${ip}`, 5, 60_000)
  if (!limit.ok) return reply({code: 'RATE_LIMITED'}, 429, {'Retry-After': String(limit.retryAfter)})

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return reply({code: 'UNSUPPORTED_MEDIA_TYPE'}, 415)
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY) return reply({code: 'PAYLOAD_TOO_LARGE'}, 413)
  const text = await request.text()
  if (text.length > MAX_BODY) return reply({code: 'PAYLOAD_TOO_LARGE'}, 413)

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return reply({code: 'INVALID_JSON'}, 400)
  }
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return reply({code: 'VALIDATION_FAILED', fields: parsed.error.issues.map((i) => i.path.join('.'))}, 422)
  }
  if (parsed.data.website) return reply({status: 'received'}, 202) // silently drop bots that fill the honeypot

  const base = process.env.BOOKING_API_URL
  if (!base) return reply({status: 'demo', saved: false}, 202)

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/inquiries`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'idempotency-key': crypto.randomUUID()},
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return reply({code: 'UPSTREAM_ERROR'}, 502)
    return reply({status: 'received', saved: true}, 202)
  } catch {
    return reply({code: 'UPSTREAM_UNAVAILABLE'}, 503)
  }
}

// Anything but POST is rejected, so the endpoint cannot be probed or cached.
export const GET = () => reply({code: 'METHOD_NOT_ALLOWED'}, 405, {Allow: 'POST'})
