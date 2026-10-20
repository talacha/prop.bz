import {NextResponse} from 'next/server'
import {requestSchema} from '@/lib/requests'

/**
 * Bookings, tours, viewings and applications are transactional, so they do not live in Sanity.
 * With BOOKING_API_URL set this forwards to the booking API (docs/openapi.yaml).
 * Without it the route validates and acknowledges in demo mode, and says so in the response.
 */
export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({code: 'INVALID_JSON'}, {status: 400})
  }
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({code: 'VALIDATION_FAILED', fields: parsed.error.issues.map((i) => i.path.join('.'))}, {status: 422})
  }
  if (parsed.data.website) return NextResponse.json({status: 'received'}, {status: 202}) // silently drop bots

  const base = process.env.BOOKING_API_URL
  if (!base) return NextResponse.json({status: 'demo', saved: false}, {status: 202})

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/inquiries`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'idempotency-key': crypto.randomUUID()},
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return NextResponse.json({code: 'UPSTREAM_ERROR'}, {status: 502})
    return NextResponse.json({status: 'received', saved: true}, {status: 202})
  } catch {
    return NextResponse.json({code: 'UPSTREAM_UNAVAILABLE'}, {status: 503})
  }
}
