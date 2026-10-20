import {notFound} from 'next/navigation'
import {isLocale, listingTypes, locales, sectionFromSlug, sectionSlugs} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'
import {ogContentType, ogJpeg, ogSize} from '@/lib/og'
import {getFeatured, getSection, getSettings} from '@/sanity/fetch'

export const alt = 'Property Business SaaS Demo'
export const size = ogSize
export const contentType = ogContentType
export const generateStaticParams = () => locales.flatMap((locale) => listingTypes.map((ty) => ({locale, section: sectionSlugs[ty][locale]})))

export default async function Image({params}: {params: Promise<{locale: string; section: string}>}) {
  const {locale, section} = await params
  if (!isLocale(locale)) notFound()
  const type = sectionFromSlug(locale, section)
  if (!type) notFound()
  const [s, sec, featured, fallback] = await Promise.all([getSettings(), getSection(type), getFeatured(type), getFeatured('vacation')])
  const own = featured[0]?.photos?.[0]?.id
  return ogJpeg({
    kind: type,
    title: loc(sec?.title, locale),
    subtitle: loc(sec?.tagline, locale),
    tag: loc(sec?.navLabel, locale),
    photoId: own ?? fallback[0]?.photos?.[0]?.id,
    tint: !own,
    brand: s.siteName ?? '',
    locale,
  })
}
