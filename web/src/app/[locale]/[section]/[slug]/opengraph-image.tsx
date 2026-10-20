import {notFound} from 'next/navigation'
import {isLocale, locales, sectionFromSlug, sectionSlugs} from '@/i18n/config'
import {formatMoney, getDictionary, loc} from '@/i18n/dictionary'
import {ogContentType, ogJpeg, ogSize} from '@/lib/og'
import {getProperty, getSection, getSettings, getSlugs} from '@/sanity/fetch'

export const alt = 'Property photo and details'
export const size = ogSize
export const contentType = ogContentType

export async function generateStaticParams() {
  const slugs = await getSlugs()
  return slugs.flatMap((s) => locales.map((locale) => ({locale, section: sectionSlugs[s.listingType][locale], slug: s.slug})))
}

export default async function Image({params}: {params: Promise<{locale: string; section: string; slug: string}>}) {
  const {locale, section, slug} = await params
  if (!isLocale(locale)) notFound()
  const type = sectionFromSlug(locale, section)
  if (!type) notFound()
  const [p, sec, s] = await Promise.all([getProperty(type, slug), getSection(type), getSettings()])
  if (!p) notFound()
  const t = getDictionary(locale)
  const price =
    type === 'vacation' && p.vacation?.nightlyRate ? `${t.from} ${formatMoney(p.vacation.nightlyRate, p.vacation.currency, locale)} ${t.perNight}`
    : type === 'rental' && p.rental?.monthlyRent ? `${formatMoney(p.rental.monthlyRent, p.rental.currency, locale)} ${t.perMonth}`
    : type === 'sale' && p.sale?.askingPrice ? formatMoney(p.sale.askingPrice, p.sale.currency, locale)
    : undefined
  const facts = [
    loc(p.area, locale),
    p.propertyType === 'land' ? (p.landAreaM2 ? `${p.landAreaM2} m²` : '') : p.bedrooms !== undefined ? t.bedrooms(p.bedrooms) : '',
    type === 'vacation' && p.maxGuests ? t.guests(p.maxGuests) : '',
    p.beachDistanceKm !== undefined ? t.beach(p.beachDistanceKm) : '',
  ].filter(Boolean)
  return ogJpeg({
    kind: type,
    title: loc(p.title, locale),
    subtitle: facts.join(' · '),
    tag: loc(sec?.navLabel, locale),
    price,
    photoId: p.gallery?.[0]?.id ?? p.photos?.[0]?.id,
    brand: s.siteName ?? '',
    locale,
  })
}
