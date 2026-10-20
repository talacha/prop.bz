import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PortableText} from '@portabletext/react'
import {JsonLd} from '@/components/JsonLd'
import {isLocale, locales, type Locale} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'
import {breadcrumbLd} from '@/lib/jsonld'
import {abs, languageAlternates, truncate} from '@/lib/site'
import {getPage, getPageSlugs, getSettings} from '@/sanity/fetch'

type Params = Promise<{locale: string; slug: string}>

export async function generateStaticParams() {
  const pages = await getPageSlugs()
  return locales.flatMap((locale) => pages.map((p) => ({locale, slug: p.slug})))
}

const textOf = (blocks: unknown): string =>
  Array.isArray(blocks) ? (blocks as {style?: string; children?: {text?: string}[]}[]).filter((b) => b.style === 'normal').map((b) => (b.children ?? []).map((c) => c.text).join('')).join(' ') : ''

export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, slug} = await params
  if (!isLocale(locale)) return {}
  const page = await getPage(slug)
  if (!page) return {}
  const paths = Object.fromEntries(locales.map((l) => [l, `/${l}/info/${slug}`])) as Record<Locale, string>
  const title = loc(page.title, locale)
  const description = truncate(textOf(page.body?.[locale]?.length ? page.body[locale] : page.body?.es), 158)
  return {title, description, alternates: {canonical: abs(paths[locale]), languages: languageAlternates(paths)}, openGraph: {title, description, url: abs(paths[locale])}}
}

export default async function InfoPage({params}: {params: Params}) {
  const {locale, slug} = await params
  if (!isLocale(locale)) notFound()
  const [page, settings] = await Promise.all([getPage(slug), getSettings()])
  if (!page) notFound()
  const body = (page.body?.[locale]?.length ? page.body[locale] : page.body?.es) as never
  const title = loc(page.title, locale)
  return (
    <div className="wrap prose-page">
      <JsonLd data={breadcrumbLd([{name: settings.siteName ?? 'Home', path: `/${locale}`}, {name: title, path: `/${locale}/info/${slug}`}])} />
      <nav className="crumbs" aria-label="Breadcrumb"><Link href={`/${locale}`}>{settings.siteName ?? 'Home'}</Link> / <span aria-current="page">{title}</span></nav>
      <article className="legal">
        <h1>{title}</h1>
        <PortableText value={body} components={{block: {h2: ({children}) => <h2>{children}</h2>}}} />
      </article>
    </div>
  )
}
