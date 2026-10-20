import {revalidateTag} from 'next/cache'
import {NextResponse} from 'next/server'
import {timingSafeEqual} from 'node:crypto'

/** Sanity webhook target: on publish, mark every cached Sanity read stale. */
export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  const given = request.headers.get('x-revalidate-secret') ?? ''
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ok: false}, {status: 401})
  }
  revalidateTag('sanity', 'max')
  return NextResponse.json({ok: true})
}
