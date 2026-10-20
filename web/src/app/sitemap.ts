import type {MetadataRoute} from 'next'
import {listingTypes, locales, propertyPath, sectionPath, type Locale} from '@/i18n/config'
import {abs, languageAlternates} from '@/lib/site'
import {assetUrl} from '@/sanity/image'
import {getPageSlugs, getSitemapEntries} from '@/sanity/fetch'

// Every URL lists its translations (hreflang) and, for properties, its photos (image sitemap).
// Sample listings are left out: they are noindex.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, pages] = await Promise.all([getSitemapEntries(), getPageSlugs()])
  const alt = (path: (l: Locale) => string) => ({languages: languageAlternates(Object.fromEntries(locales.map((l) => [l, path(l)])) as Record<Locale, string>)})
  const latest = entries.map((e) => e._updatedAt).sort().at(-1)
  return [
    ...locales.map((l) => ({url: abs(`/${l}`), lastModified: latest, changeFrequency: 'weekly' as const, priority: 1, alternates: alt((x) => `/${x}`)})),
    ...locales.flatMap((l) => listingTypes.map((t) => ({url: abs(sectionPath(l, t)), lastModified: latest, changeFrequency: 'daily' as const, priority: 0.9, alternates: alt((x) => sectionPath(x, t))}))),
    ...locales.flatMap((l) => pages.map((p) => ({url: abs(`/${l}/info/${p.slug}`), lastModified: p._updatedAt, changeFrequency: 'yearly' as const, priority: 0.3, alternates: alt((x) => `/${x}/info/${p.slug}`)}))),
    ...locales.flatMap((l) =>
      entries.map((e) => ({
        url: abs(propertyPath(l, e.listingType, e.slug)),
        lastModified: e._updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: alt((x) => propertyPath(x, e.listingType, e.slug)),
        images: e.images.map((id) => `${assetUrl(id)}?w=1600&fm=jpg&q=75`),
      })),
    ),
  ]
}
