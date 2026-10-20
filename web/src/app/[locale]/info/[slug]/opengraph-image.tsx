import {notFound} from 'next/navigation'
import {isLocale, locales} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'
import {ogContentType, ogJpeg, ogSize} from '@/lib/og'
import {getPage, getPageSlugs, getSettings} from '@/sanity/fetch'

export const alt = 'Property Business SaaS Demo'
export const size = ogSize
export const contentType = ogContentType

export async function generateStaticParams() {
  const pages = await getPageSlugs()
  return locales.flatMap((locale) => pages.map((p) => ({locale, slug: p.slug})))
}

export default async function Image({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params
  if (!isLocale(locale)) notFound()
  const [page, s] = await Promise.all([getPage(slug), getSettings()])
  if (!page) notFound()
  return ogJpeg({kind: 'home', title: loc(page.title, locale), subtitle: loc(s.tagline, locale), brand: s.siteName ?? '', locale})
}
