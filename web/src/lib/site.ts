import {locales, type Locale} from '@/i18n/config'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.prop.bz').replace(/\/$/, '')
export const abs = (path: string) => `${SITE_URL}${path}`

export const OG_LOCALE: Record<Locale, string> = {es: 'es_MX', en: 'en_US'}

// Where the portfolio is. Used for local SEO (geo meta, schema.org address, copy).
export const PLACE = {
  locality: 'Playa del Carmen',
  region: 'Quintana Roo',
  regionCode: 'MX-ROO',
  country: 'MX',
  lat: 20.6296,
  lng: -87.0739,
}

/** hreflang map with an x-default (Spanish). Every URL must be absolute or crawlers reject it. */
export function languageAlternates(paths: Record<Locale, string>): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, abs(paths[l])])),
    'x-default': abs(paths.es),
  }
}

/** Safe for <script type="application/ld+json">: escapes "<" so content can never close the tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

export const truncate = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…')
