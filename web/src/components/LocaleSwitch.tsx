'use client'

import Link from 'next/link'
import {usePathname, useSearchParams} from 'next/navigation'
import {sectionSlugs, listingTypes, type Locale} from '@/i18n/config'

/** Swaps the locale and the localized section segment, keeping the rest of the path and the query. */
export function LocaleSwitch({locale, label}: {locale: Locale; label: string}) {
  const path = usePathname()
  const sp = useSearchParams()
  const other: Locale = locale === 'es' ? 'en' : 'es'
  const parts = path.split('/').filter(Boolean)
  parts[0] = other
  if (parts[1]) {
    const ty = listingTypes.find((t) => sectionSlugs[t][locale] === parts[1])
    if (ty) parts[1] = sectionSlugs[ty][other]
  }
  const qs = sp.toString()
  return (
    <Link className="pill" href={`/${parts.join('/')}${qs ? `?${qs}` : ''}`} hrefLang={other} lang={other}>{label}</Link>
  )
}
