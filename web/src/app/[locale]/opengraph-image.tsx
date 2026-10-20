import {notFound} from 'next/navigation'
import {isLocale, locales} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'
import {ogContentType, ogJpeg, ogSize} from '@/lib/og'
import {getFeatured, getSettings} from '@/sanity/fetch'

export const alt = 'Property Business SaaS Demo'
export const size = ogSize
export const contentType = ogContentType
export const generateStaticParams = () => locales.map((locale) => ({locale}))

export default async function Image({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!isLocale(locale)) notFound()
  const [s, featured] = await Promise.all([getSettings(), getFeatured('vacation')])
  return ogJpeg({
    kind: 'home',
    title: s.siteName ?? 'Property Business SaaS Demo',
    subtitle: locale === 'es' ? 'Estancias, rentas y venta en Playa del Carmen' : 'Stays, rentals and sales in Playa del Carmen',
    tag: loc(s.trustPoints?.[0], locale) || undefined,
    photoId: featured[0]?.photos?.[0]?.id,
    brand: s.siteName ?? '',
    locale,
  })
}
