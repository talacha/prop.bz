import {NextResponse, type NextRequest} from 'next/server'
import {defaultLocale, locales} from '@/i18n/config'

// Send "/" and any path without a locale prefix to the visitor's language (Spanish by default).
export function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return
  const saved = request.cookies.get('NEXT_LOCALE')?.value
  const accept = request.headers.get('accept-language')?.toLowerCase() ?? ''
  const locale = saved === 'es' || saved === 'en' ? saved : /^\s*en|,\s*en/.test(accept) && !/^\s*es/.test(accept) ? 'en' : defaultLocale
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
